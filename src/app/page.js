import AEChatbot from '@/components/AEChatbot';
import StarryBackground from '@/components/StarryBackground';

export default function Home() {
  return (
    <>
      <StarryBackground />
      <main className="min-h-screen p-8 relative">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center text-white">
            AE Transfer Chatbot
          </h1>
          <AEChatbot />
        </div>
      </main>
    </>
  );
}