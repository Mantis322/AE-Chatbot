"use client"
import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, Wallet, X, Shield, Mail } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
    AeSdkAepp,
    Node,
    BrowserWindowMessageConnection,
    walletDetector,
    Contract,
    CompilerHttp
} from '@aeternity/aepp-sdk';

// Components
import LoadingSpinner from './LoadingSpinner';


// Constants
const TESTNET_NODE_URL = 'https://testnet.aeternity.io';
const COMPILER_URL = 'https://v8.compiler.aepps.com';
const CONTRACT_ADDRESS = "ct_2n5V3r9RDEWRhwEzLSbhhT8ah2eY3AJtH4bKNckgo2zmvNHEC6";

const AEChatbot = () => {
    // State definitions
    const [showQR, setShowQR] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [walletConnected, setWalletConnected] = useState(false);
    const [sdk, setSdk] = useState(null);
    const [userAddress, setUserAddress] = useState(null);
    const [networkId, setNetworkId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isWalletLoading, setIsWalletLoading] = useState(false);
    const [showWelcome, setShowWelcome] = useState(true);
    const [isConnectionComplete, setIsConnectionComplete] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [email, setEmail] = useState('');
    const [dailyLimit, setDailyLimit] = useState('');
    const [emailError, setEmailError] = useState('');
    const [currentEmail, setCurrentEmail] = useState('');
    const [contract, setContract] = useState(null);
    const [recipientAddress, setRecipientAddress] = useState('');
    const [transferAmount, setTransferAmount] = useState('');

    // Security states
    const [isTwoFAEnabled, setIsTwoFAEnabled] = useState(false);
    const [showTwoFAPrompt, setShowTwoFAPrompt] = useState(false);
    const [showSecuritySettings, setShowSecuritySettings] = useState(false);

    // Contract source code remains unchanged as it's not a comment
    const CONTRACT_SOURCE_CODE = `contract SecurityLayer =

  record state = {
    owner: address,
    user_limits: map(address, int),   
    daily_totals: map(address, int),  
    last_reset: map(address, int),    
    risk_scores: map(address, int),   
    two_fa_enabled: map(address, bool), 
    user_emails: map(address, string)
    }

  stateful entrypoint init() = {
    owner = Call.caller,
    user_limits = {},
    daily_totals = {},
    last_reset = {},
    risk_scores = {},
    two_fa_enabled = {},
    user_emails = {}
    }

  stateful entrypoint set_user_limit( limit: int) =
    put(state{ user_limits[Call.caller] = limit })

  stateful entrypoint set_email( email: string) =
    require(state.two_fa_enabled[Call.caller] == true, "2FA must be enabled to view email")
    require(Call.caller == state.owner, "Only owner can set emails") // Yalnızca sahip e-posta atayabilir
    put(state{ user_emails[Call.caller] = email })


  entrypoint get_email() : string =
    require(Call.caller == state.owner, "You can only view your own email or the owner's email")
    Map.lookup_default(Call.caller, state.user_emails, "Email not set")


  stateful entrypoint toggle_two_fa(enabled: bool) =
    put(state{ two_fa_enabled[Call.caller] = enabled })

  entrypoint is_two_fa_enabled() : bool =
    let caller_status = Map.lookup_default(Call.caller, state.two_fa_enabled, false)
    caller_status

  entrypoint check_transaction( amount: int) : bool =
    let daily_total = Map.lookup_default(Call.caller, state.daily_totals, 0)
    let user_limit = Map.lookup_default(Call.caller, state.user_limits, 1000000) // Varsayılan limit
    let risk_score = calculate_risk_score(amount)


    if(daily_total + amount > user_limit)
      false

    elif(risk_score > 80)
      false
    else
      true
 
  function calculate_risk_score( amount: int) : int =
    let base_score = 
      if(amount > 10000) 
        80  
      elif(amount > 5000)
        50  
      else 
        20 

    let user_risk = Map.lookup_default(Call.caller, state.risk_scores, 0)
    (base_score + user_risk) / 2


  stateful entrypoint reset_daily_total() =
    let last = Map.lookup_default(Call.caller, state.last_reset, 0)
    if(Chain.timestamp - last > 86400000) 
      put(state{ daily_totals[Call.caller] = 0,
                 last_reset[Call.caller] = Chain.timestamp })`

    const messageEndRef = useRef(null);

    const loadContractData = async () => {
        if (!sdk) {
            console.error('SDK not initialized');
            return;
        }

        try {
            // Initialize contract with proper error handling
            const contractInstance = await Contract.initialize(
                {
                    ...sdk.getContext(),
                    sourceCode: CONTRACT_SOURCE_CODE,
                    client: sdk,
                    onAccount: sdk,
                    address: CONTRACT_ADDRESS,
                },
            );

            setContract(contractInstance);
            console.log('Contract loaded successfully');

            return contractInstance;
        } catch (error) {
            console.error('Error loading contract:', error);
            throw new Error('Failed to initialize contract: ' + error.message);
        }
    };


    // Auto-scroll effect
    const scrollToBottom = () => {
        messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);




     // Welcome messages
    useEffect(() => {
        if (showWelcome) {
            const welcomeMessages = [
                {
                    type: 'bot',
                    content: '👋 Welcome to AE Transfer Chatbot!'
                },
                {
                    type: 'bot',
                    content: "I'm here to help you with your Aeternity blockchain operations. Here's what I can do for you:"
                },
                {
                    type: 'bot',
                    content: "🔵 Transfer AE tokens\n" +
                        "💰 Check your balance\n" +
                        "📜 View transaction history\n" +
                        "🔲 Generate wallet QR code"
                },
                {
                    type: 'bot',
                    content: "To get started, please connect your wallet. Once connected, you can try these commands:\n\n" +
                        "• Send tokens: 'send 5 AE to ak_...'\n" +
                        "• Check balance: 'show my balance'\n" +
                        "• View history: 'show my history'\n" +
                        "• Generate QR: 'show my wallet QR code'"
                },
                {
                    type: 'bot',
                    content: "Need help? Just type 'help' or ask me what I can do! 😊"
                }
            ];

            let delay = 0;
            welcomeMessages.forEach((msg) => {
                setTimeout(() => {
                    setMessages(prev => [...prev, msg]);
                }, delay);
                delay += 800;
            });

            setShowWelcome(false);
        }
    }, [showWelcome]);

    // Wallet connection
    const connectWallet = async () => {
        try {
            setIsWalletLoading(true);
            setIsConnectionComplete(false);
            const node = new Node(TESTNET_NODE_URL);
            const aeSdk = new AeSdkAepp({
                name: 'AE Transfer Chatbot',
                nodes: [{ name: 'testnet', instance: node }],
                compilerUrl: COMPILER_URL,
                onCompiler: new CompilerHttp(COMPILER_URL),
                onNetworkChange: async ({ networkId }) => {
                    try {
                        const nodes = await aeSdk.getNodesInPool();
                        const [{ name }] = nodes.filter((node) => node.nodeNetworkId === networkId);
                        await aeSdk.selectNode(name);
                        console.log('Network changed:', networkId); // Debug için log
                        setNetworkId(networkId); // networkId state'ini güncelle
                    } catch (error) {
                        console.error('Network change error:', error);
                    }
                },
                onAddressChange: ({ current }) => {
                    setUserAddress(Object.keys(current)[0]);
                },
                onDisconnect: () => {
                    addMessage('bot', 'Wallet connection lost!');
                    setWalletConnected(false);
                    setIsConnectionComplete(false);
                    setContract(null); // Reset contract on disconnect
                },
            });

            const handleWallets = async ({ wallets, newWallet }) => {
                newWallet = newWallet || Object.values(wallets)[0];

                try {
                    addMessage('bot-loading', 'Establishing wallet connection...');

                    const connection = await newWallet.getConnection();
                    await aeSdk.connectToWallet(connection);

                    stopScan();
                    setSdk(aeSdk);

                    // Network durumunu al ve state'i güncelle
                    const currentNetwork = await aeSdk.getNodeInfo();
                    console.log('Current network:', currentNetwork); // Debug için log
                    setNetworkId(currentNetwork.nodeNetworkId);

                    const { address: { current } } = await aeSdk.subscribeAddress('subscribe', 'connected');
                    setUserAddress(Object.keys(current)[0]);

                    // Initialize contract immediately after wallet connection
                    try {
                        const contractInstance = await Contract.initialize(
                            {
                                ...aeSdk.getContext(),
                                sourceCode: CONTRACT_SOURCE_CODE,
                                client: aeSdk,
                                onAccount: aeSdk,
                                address: CONTRACT_ADDRESS,
                            },
                        );
                        setContract(contractInstance);
                        console.log('Contract initialized successfully');

                        // Check 2FA status immediately
                        const verifyStatus = await contractInstance.is_two_fa_enabled();
                        setIsTwoFAEnabled(verifyStatus.decodedResult);
                    } catch (contractError) {
                        console.error('Contract initialization error:', contractError);
                        addMessage('bot', `Warning: Security features may be limited. Error: ${contractError.message}`);
                    }

                    setMessages(prev => prev.filter(msg => msg.type !== 'bot-loading'));
                    addMessage('bot', `Wallet successfully connected! You can now start using the chatbot.`);

                    setWalletConnected(true);
                    setIsConnectionComplete(true);
                } catch (error) {
                    setMessages(prev => prev.filter(msg => msg.type !== 'bot-loading'));
                    addMessage('bot', `Wallet connection error: ${error.message}`);
                    setIsConnectionComplete(false);
                    setWalletConnected(false);
                    setContract(null);
                }
            };

            const scannerConnection = new BrowserWindowMessageConnection();
            const stopScan = walletDetector(scannerConnection, handleWallets);

        } catch (error) {
            console.error('Wallet connection error:', error);
            addMessage('bot', `Wallet connection error: ${error.message}`);
            setIsConnectionComplete(false);
            setWalletConnected(false);
            setContract(null);
        } finally {
            setIsWalletLoading(false);
        }
    };

    const handleSecuritySettingsClick = async () => {
        try {
            setIsLoading(true);

            if (!sdk) {
                throw new Error('SDK not initialized. Please reconnect your wallet.');
            }

            // If contract is not initialized, try to initialize it
            if (!contract) {
                console.log('Initializing contract...');
                const contractInstance = await Contract.initialize(
                    {
                        ...sdk.getContext(),
                        sourceCode: CONTRACT_SOURCE_CODE,
                        client: sdk,
                        onAccount: sdk,
                        address: CONTRACT_ADDRESS,
                    },
                );
                setContract(contractInstance);
                console.log('Contract initialized in security settings');
            }

            // Double check contract exists before proceeding
            if (!contract) {
                throw new Error('Failed to initialize contract');
            }

            console.log('Checking 2FA status...');
            const verifyStatus = await contract.is_two_fa_enabled();
            console.log('2FA status:', verifyStatus);

            setIsTwoFAEnabled(verifyStatus.decodedResult);
            setShowSecuritySettings(true);

        } catch (error) {
            console.error('Security settings error:', error);
            addMessage('bot', `Security settings error: ${error.message}`);
            // Add debugging information
            console.log('Current SDK state:', !!sdk);
            console.log('Current contract state:', !!contract);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTwoFAToggle = async (checked) => {
        try {
            setIsLoading(true);

            await loadContractData();

            if (isTwoFAEnabled == true) {

                const result = await contract.toggle_two_fa(false)
                    .catch(err => {
                        throw new Error(`Contract call failed: ${err.message}`);
                    });

                setIsTwoFAEnabled(false);
            } else {

                const result = await contract.toggle_two_fa(true)
                    .catch(err => {
                        throw new Error(`Contract call failed: ${err.message}`);
                    });


                setIsTwoFAEnabled(true);
            }
        } catch (error) {
            console.error('2FA toggle error:', error);
            addMessage('bot', `Error toggling 2FA: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEmailUpdate = async (newEmail) => {
        try {
            setIsLoading(true);
            setEmailError('');

            if (!newEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                setEmailError('Please enter a valid email address');
                return;
            }

            // Email update logic here
            setCurrentEmail(newEmail);

            await loadContractData();

            await contract.set_email(newEmail)
                .catch(err => {
                    throw new Error(`Contract call failed: ${err.message}`);
                });


            setEmail('');
            addMessage('bot', `Email updated successfully to ${newEmail}`);
        } catch (error) {
            console.error('Email update error:', error);
            setEmailError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLimitUpdate = async (limit) => {
        try {
            setIsLoading(true);

            if (parseFloat(limit) <= 0) {
                throw new Error('Limit must be greater than 0');
            }

            await loadContractData();

            const limitInAettos = BigInt(limit * 1e18).toString();

            const result = await contract.set_user_limit(limitInAettos)
                .catch(err => {
                    throw new Error(`Contract call failed: ${err.message}`);
                });

            // Limit update logic here
            setDailyLimit('');
            addMessage('bot', `Daily limit updated successfully to ${limit} AE`);
        } catch (error) {
            console.error('Limit update error:', error);
            addMessage('bot', `Error updating limit: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Process transfer
    const processTransfer = async (recipientAddress, amount) => {
        try {
            setIsLoading(true);
            setRecipientAddress(recipientAddress)
            setTransferAmount(amount)
            await loadContractData();

            // Basic controller
            if (!sdk) {
                throw new Error('SDK not initialized');
            }

            if (!recipientAddress.startsWith('ak_')) {
                throw new Error('Invalid address format. Address must start with "ak_"');
            }

            // Amount check
            if (amount <= 0) {
                throw new Error('Transfer amount must be greater than 0');
            }

            // Balance Check
            const balance = await sdk.getBalance(userAddress);
            const balanceInAE = balance / 1e18;
            if (balanceInAE < amount) {
                throw new Error('Insufficient funds');
            }


            const amountInAettos = BigInt(amount * 1e18).toString();
            const securityCheck = await contract.check_transaction(
                amountInAettos
            );

            console.log(securityCheck)

            if (!securityCheck) {
                addMessage('bot', '❌ Security check failed: The transaction exceeds your daily limit or has been flagged as high risk.');
                return;
            }


            if (isTwoFAEnabled) {
                setShowTwoFAPrompt(true);
                return;
            } else {


                addMessage('bot-loading', 'Processing transfer...');

                const result = await sdk.spend(amountInAettos, recipientAddress);

                setMessages(prev => prev.filter(msg => msg.type !== 'bot-loading'));

                addMessage('bot',
                    `✅ Successfully transferred ${amount} AE to ${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-4)}.\n\n` +
                    `Transaction hash:\n${result.hash}`
                );

                // Create Explorer URL
                const explorerUrl = networkId === 'ae_mainnet'
                    ? `https://explorer.aeternity.io/transactions/${result.hash}`
                    : `https://testnet.aescan.io/transactions/${result.hash}`;


                addMessage('bot-link', {
                    text: 'View transaction in explorer',
                    url: explorerUrl
                });

                // Daily limit update after the transaction
                try {
                    await contract.reset_daily_total();
                } catch (error) {
                    console.error('Error resetting daily total:', error);
                }

                // Email notification (under development)
                try {
                    const userEmail = await securityManager.getUserEmail(userAddress);
                    if (userEmail && userEmail !== 'Email not set') {
                        addMessage('bot', `✉️ Transaction confirmation sent to ${userEmail}`);
                    }
                } catch (error) {
                    console.error('Error sending email notification:', error);
                }

                // Balance update suggestion
                setTimeout(() => {
                    addMessage('bot', '💡 Type "show my balance" to see your updated balance.');
                }, 1000);
            }

        } catch (error) {

            setMessages(prev => prev.filter(msg => msg.type !== 'bot-loading'));
            console.error('Transfer error:', error);


            let errorMessage = 'Transfer failed: ';
            if (error.message.includes('insufficient funds')) {
                errorMessage += 'Insufficient funds in your wallet.';
            } else if (error.message.includes('gas')) {
                errorMessage += 'Not enough AE for gas fees.';
            } else if (error.message.includes('rejected')) {
                errorMessage += 'Transaction was rejected.';
            } else if (error.message.includes('limit')) {
                errorMessage += 'Transaction exceeds your daily limit.';
            } else if (error.message.includes('risk')) {
                errorMessage += 'Transaction was flagged as high risk.';
            } else {
                errorMessage += error.message;
            }

            addMessage('bot', `❌ ${errorMessage}`);
        } finally {
            setIsLoading(false);
            setRecipientAddress('')
            setTransferAmount('')
        }
    };

    const executeTransfer = async (recipientAddress, amount) => {

        const amountInAettos = BigInt(amount * 1e18).toString();
        // Start transfer process
        addMessage('bot-loading', 'Processing transfer...');

        // Execute transfer
        const result = await sdk.spend(amountInAettos, recipientAddress);

        // Remove loading message
        setMessages(prev => prev.filter(msg => msg.type !== 'bot-loading'));

        // Successful transfer message
        addMessage('bot',
            `✅ Successfully transferred ${amount} AE to ${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-4)}.\n\n` +
            `Transaction hash:\n${result.hash}`
        );

        // Create explorer URL
        const explorerUrl = networkId === 'ae_mainnet'
            ? `https://explorer.aeternity.io/transactions/${result.hash}`
            : `https://testnet.aescan.io/transactions/${result.hash}`;

        // Explorer link message
        addMessage('bot-link', {
            text: 'View transaction in explorer',
            url: explorerUrl
        });

        // Update daily limit after transaction
        try {
            await contract.reset_daily_total();
        } catch (error) {
            console.error('Error resetting daily total:', error);
        }

        // Email notification (if email is set)
        try {
            const userEmail = await contract.get_email();
            if (userEmail && userEmail !== 'Email not set') {
                addMessage('bot', `✉️ Transaction confirmation sent to ${userEmail}`);
            }
        } catch (error) {
            console.error('Error sending email notification:', error);
        }

        // Balance update suggestion
        setTimeout(() => {
            addMessage('bot', '💡 Type "show my balance" to see your updated balance.');
        }, 1000);

        setIsLoading(false);
        setRecipientAddress('')
        setTransferAmount('')
    };

    // 2FA authentication handler (code 123456 in demo process)
    const handle2FAVerification = async (code) => {
        try {

            if (verificationCode === "123456") {
                setShowTwoFAPrompt(false);
                await executeTransfer(
                    recipientAddress,
                    transferAmount
                );
            } else {
                addMessage('bot', '❌ Invalid 2FA code. Please try again.');
            }
        } catch (error) {
            console.error('2FA verification error:', error);
            addMessage('bot', `❌ 2FA verification error: ${error.message}`);
        } finally {
            setVerificationCode('');
        }
    };
    // Balance Check Function
    const checkBalance = async () => {
        try {
            setIsLoading(true);
            addMessage('bot-loading', 'Checking your balance...');

            const balance = await sdk.getBalance(userAddress);
            const balanceInAE = balance / 1e18;

            setMessages(prev => prev.filter(msg => msg.type !== 'bot-loading'));
            addMessage('bot', `Your current balance is: ${balanceInAE.toFixed(4)} AE`);

        } catch (error) {
            setMessages(prev => prev.filter(msg => msg.type !== 'bot-loading'));
            addMessage('bot', `Error checking balance: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Transaction history
    const getTransactionHistory = async () => {
        addMessage('bot-link', {
            text: '📜 View all your transactions in the explorer',
            url: `https://testnet.aescan.io/accounts/${userAddress}`
        });
    };

    // QR code generation
    const handleQRCodeRequest = () => {
        if (!walletConnected || !userAddress) {
            addMessage('bot', 'Please connect your wallet first to generate QR code.');
            return;
        }
        setShowQR(true);
        addMessage('bot', 'Here is your wallet address QR code:');
    };

    
    const addMessage = (type, content) => {
        setMessages(prev => [...prev, { type, content }]);
    };

    // Process user message
    const processUserMessage = (message) => {
        const helpRegex = /^help$|what.+can.+you.+do|what.+are.+your.+features/i;
        const qrCodeRegex = /(?:generate|create|show|get|display)?\s*(?:my)?\s*(?:wallet|address)?\s*(?:qr|qr code)/i;
        const balanceRegex = /(?:show|check|view|get|what(?:'s|\s+is))?\s*(?:my)?\s*balance/i;
        const historyRegex = /(?:show|view|get|what(?:'s|\s+is))?\s*(?:my)?\s*(?:transaction|tx)?\s*history/i;
        const transferRegex = /(?:send|transfer)\s+(\d+(\.\d+)?)\s*AE\s+(?:to\s+)?(ak_[a-zA-Z0-9]+)/i;

        if (!walletConnected) {
            addMessage('bot', 'Please connect your wallet first.');
            return;
        }

        if (helpRegex.test(message.toLowerCase())) {
            addMessage('bot', "Here's what I can help you with:");
            addMessage('bot',
                "🔵 Transfer AE tokens: 'send 5 AE to ak_...'\n" +
                "💰 Check balance: 'show my balance'\n" +
                "📜 View history: 'show my history'\n" +
                "🔲 Generate QR: 'show my wallet QR code'\n\n" +
                "Just type any of these commands to get started!"
            );
            return;
        }

        if (qrCodeRegex.test(message.toLowerCase())) {
            handleQRCodeRequest();
            return;
        }

        if (balanceRegex.test(message.toLowerCase())) {
            checkBalance();
            return;
        }

        if (historyRegex.test(message.toLowerCase())) {
            getTransactionHistory();
            return;
        }

        const transferMatch = message.match(transferRegex);
        if (transferMatch) {
            const amount = parseFloat(transferMatch[1]);
            const address = transferMatch[3];

            if (amount <= 0) {
                addMessage('bot', 'Transfer amount must be greater than 0.');
                return;
            }

            addMessage('bot', `I understand you want to transfer ${amount} AE to ${address}. Starting the transaction...`);
            processTransfer(address, amount);
        } else {
            addMessage('bot',
                'I can help you with:\n' +
                '1. Transfers: "send 5 AE to ak_..."\n' +
                '2. Balance check: "show my balance"\n' +
                '3. Transaction history: "show my history"\n' +
                '4. QR Code: "show my wallet QR code"\n' +
                '5. Help: "help"'
            );
        }
    };

    // Form submit
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        addMessage('user', input);
        processUserMessage(input);
        setInput('');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-gray-900 to-gray-800">
            <div className="w-full max-w-4xl">
                {!walletConnected ? (
                    <Card className="w-full backdrop-blur-sm bg-white/10 border-white/20">
                        <CardContent className="p-6">
                            <div className="text-center space-y-4">
                                <h2 className="text-xl text-white font-semibold">
                                    Welcome to AE Transfer Chatbot
                                </h2>
                                <p className="text-gray-300">
                                    Please connect your wallet to start using the chatbot
                                </p>
                                <Button
                                    onClick={connectWallet}
                                    disabled={isWalletLoading}
                                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 transition-colors mx-auto"
                                >
                                    {isWalletLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <Wallet className="w-4 h-4" />
                                            Connect Wallet
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : !isConnectionComplete ? (
                    <Card className="w-full backdrop-blur-sm bg-white/10 border-white/20">
                        <CardContent className="p-6">
                            <div className="text-center space-y-4">
                                <LoadingSpinner />
                                <p className="text-gray-300">Completing wallet connection...</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="w-full backdrop-blur-sm bg-white/10 border-white/20">
                        <CardContent className="p-6">
                            {/* Wallet bağlantı durumu */}
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <Button
                                        className="bg-green-500 hover:bg-green-600 transition-colors"
                                        disabled={true}
                                    >
                                        <Wallet className="w-4 h-4 mr-2" />
                                        Connected
                                    </Button>
                                    {userAddress && (
                                        <span className="text-sm text-slate-300">
                                            {userAddress.slice(0, 8)}...{userAddress.slice(-4)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-4">
                                    {/* Security Status */}
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center">
                                            <span className="text-sm text-slate-300 mr-2">2FA</span>
                                            <div className={`w-2 h-2 rounded-full ${isTwoFAEnabled ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                        </div>
                                        <Button
                                            onClick={handleSecuritySettingsClick}
                                            className="text-sm bg-white/10 hover:bg-white/20 transition-colors"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                'Security'
                                            )}
                                        </Button>
                                    </div>
                                    {/* Network Status */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-300">
                                            {networkId === 'ae_mainnet' ? 'Mainnet' :
                                                networkId === 'ae_uat' ? 'Testnet' :
                                                    'Not Connected'}
                                        </span>
                                        <div className={`w-2 h-2 rounded-full ${networkId === 'ae_mainnet' ? 'bg-green-500' :
                                                networkId === 'ae_uat' ? 'bg-green-500' :
                                                    'bg-yellow-500'
                                            }`} />
                                    </div>
                                </div>
                            </div>

                            {/* Message list */}
                            <div className="h-96 overflow-y-auto mb-4 space-y-4 border border-white/10 rounded-lg p-4 backdrop-blur-sm">
                                {messages.map((message, index) => (
                                    <div
                                        key={index}
                                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {message.type === 'bot-loading' ? (
                                            <LoadingSpinner />
                                        ) : (
                                            <div
                                                className={`rounded-lg px-4 py-2 max-w-[80%] break-words whitespace-pre-wrap 
                                                ${message.type === 'user'
                                                        ? 'bg-blue-500 text-white'
                                                        : message.type === 'bot-link'
                                                            ? 'bg-white/20 text-white hover:bg-white/30 cursor-pointer transition-colors'
                                                            : 'bg-gray-700 text-white'}`}
                                                onClick={() => {
                                                    if (message.type === 'bot-link') {
                                                        if (typeof message.content === 'object') {
                                                            window.open(message.content.url, '_blank');
                                                        } else {
                                                            window.open(message.content, '_blank');
                                                        }
                                                    }
                                                }}
                                            >
                                                {message.type === 'bot-link' ? (
                                                    <div className="flex items-center gap-2">
                                                        <span>🔗</span>
                                                        <span className="underline">
                                                            {typeof message.content === 'object'
                                                                ? message.content.text
                                                                : 'View transaction in explorer'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="text-white">
                                                        {message.content.split('\n').map((text, i) => (
                                                            <React.Fragment key={i}>
                                                                {text}
                                                                {i !== message.content.split('\n').length - 1 && <br />}
                                                            </React.Fragment>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={messageEndRef} />
                            </div>

                            {/* QR Code Modal */}
                            {showQR && userAddress && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                    <div className="bg-white p-6 rounded-lg relative">
                                        <Button
                                            onClick={() => setShowQR(false)}
                                            className="absolute top-2 right-2 p-1 hover:bg-gray-100"
                                            variant="ghost"
                                        >
                                            <X className="w-4 h-4 text-gray-600" />
                                        </Button>
                                        <div className="text-center">
                                            <QRCodeSVG
                                                value={userAddress}
                                                size={256}
                                                level="H"
                                                includeMargin={true}
                                                className="mx-auto mb-4"
                                            />
                                            <p className="text-sm text-gray-600 break-all">{userAddress}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Input form */}
                            <form onSubmit={handleSubmit} className="flex gap-2">
                                <Input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder='Type your message... (e.g., "send 5 AE to ak_...")'
                                    className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-slate-400"
                                    disabled={isLoading}
                                />
                                <Button
                                    type="submit"
                                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 transition-colors"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    {isLoading ? 'Processing...' : 'Send'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Security Settings Modal */}
                {showSecuritySettings && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg relative max-w-md w-full">
                            <Button
                                onClick={() => setShowSecuritySettings(false)}
                                className="absolute top-2 right-2 hover:bg-gray-100 text-gray-600"
                                variant="ghost"
                                size="icon"
                            >
                                <X className="h-4 w-4" />
                            </Button>

                            <h3 className="text-xl font-semibold mb-6 text-gray-900">Security Settings</h3>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                            <Shield className="w-4 h-4" />
                                            Two-Factor Authentication
                                        </h4>
                                        <p className="text-sm text-gray-500">Add an extra layer of security to your transactions</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={isTwoFAEnabled}
                                        onChange={(e) => handleTwoFAToggle(e.target.checked)}
                                        disabled={isLoading}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                        <Mail className="w-4 h-4" />
                                        Email Address
                                    </h4>
                                    <p className="text-sm text-gray-500">Set your email for notifications and recovery</p>
                                    {currentEmail && (
                                        <p className="text-sm text-gray-600">
                                            Current: {currentEmail}
                                        </p>
                                    )}
                                    <div className="flex gap-2">
                                        <Input
                                            type="email"
                                            placeholder="Enter your email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="flex-1 text-gray-900"
                                            disabled={isLoading}
                                        />
                                        <Button
                                            onClick={() => handleEmailUpdate(email)}
                                            className="bg-blue-500 hover:bg-blue-600 text-white"
                                            disabled={isLoading || !email}
                                        >
                                            {isLoading ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : 'Update'}
                                        </Button>
                                    </div>
                                    {emailError && (
                                        <p className="text-sm text-red-500">{emailError}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <h4 className="font-medium text-gray-900 flex items-center gap-2">
                                        <Wallet className="w-4 h-4" />
                                        Daily Transaction Limit
                                    </h4>
                                    <p className="text-sm text-gray-500">Set maximum daily transaction amount in AE</p>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            placeholder="Enter limit in AE"
                                            value={dailyLimit}
                                            onChange={(e) => setDailyLimit(e.target.value)}
                                            className="flex-1 text-gray-900"
                                            disabled={isLoading}
                                        />
                                        <Button
                                            onClick={() => handleLimitUpdate(dailyLimit)}
                                            className="bg-blue-500 hover:bg-blue-600 text-white"
                                            disabled={isLoading || !dailyLimit}
                                        >
                                            {isLoading ? (
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : 'Save'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2FA Verification Modal */}
                {showTwoFAPrompt && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white p-6 rounded-lg relative max-w-md w-full">
                            <h3 className="text-xl font-semibold mb-4 text-gray-900">Two-Factor Authentication</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Please enter the verification code to complete your transaction.
                            </p>

                            <form onSubmit={(e) => {
                                e.preventDefault();
                                handle2FAVerification(verificationCode);
                            }}>
                                <Input
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    placeholder="Enter 6-digit code"
                                    className="mb-4 text-gray-900"
                                    maxLength={6}
                                    disabled={isLoading}
                                />
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        onClick={() => {
                                            setShowTwoFAPrompt(false);
                                            setVerificationCode('');
                                        }}
                                        variant="outline"
                                        disabled={isLoading}
                                        className="text-gray-700 hover:text-gray-900 border-gray-300"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isLoading || verificationCode.length !== 6}
                                        className="bg-blue-500 hover:bg-blue-600 text-white"
                                    >
                                        {isLoading ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : 'Verify'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AEChatbot;
