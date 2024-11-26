import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

const TwoFAPrompt = ({ onVerify, onCancel }) => {
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        await onVerify(verificationCode);
        setIsLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg relative max-w-md w-full">
                <h3 className="text-xl font-semibold mb-4 text-gray-900">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-500 mb-4">Please enter the verification code to complete your transaction.</p>
                
                <form onSubmit={handleSubmit}>
                    <Input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="Enter 6-digit code"
                        className="mb-4 text-gray-900 placeholder:text-gray-500"
                        maxLength={6}
                        disabled={isLoading}
                    />
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            onClick={onCancel}
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
    );
};

export default TwoFAPrompt;