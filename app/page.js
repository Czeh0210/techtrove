'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isVideoEnded, setIsVideoEnded] = useState(false);

  useEffect(() => {
    // Preload the chatbot page
    router.prefetch('/chatbot');
  }, [router]);

  const handleVideoEnd = () => {
    setIsVideoEnded(true);
    // Transition to chatbot page after video ends
    setTimeout(() => {
      router.push('/chatbot');
    }, 500); // Small delay for smooth transition
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center bg-black transition-opacity duration-500 ${isVideoEnded ? 'opacity-0' : 'opacity-100'}`}>
      <video
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        className="w-screen h-screen object-cover"
      >
        <source src="/Simple-Dot-[remix].mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
