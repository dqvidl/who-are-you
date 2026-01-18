'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function WaitingPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [status, setStatus] = useState<'ready' | 'not ready' | 'loading'>('loading');
  const [siteUrl, setSiteUrl] = useState<string | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/status/${sessionId}`);
        const data = await response.json();
        
        if (response.ok) {
          setStatus(data.status === 'ready' ? 'ready' : 'not ready');
          setSiteUrl(data.siteUrl);
        }
      } catch (error) {
        console.error('Status check error:', error);
        setStatus('not ready');
      }
    };

    checkStatus();
    
    // Poll every 3 seconds if not ready
    const interval = setInterval(() => {
      if (status === 'not ready') {
        checkStatus();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [sessionId, status]);

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-6 font-lota">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <h1 className="text-3xl font-light text-gray-800 mb-6">your friend's site</h1>
        
        {status === 'loading' && (
          <div className="space-y-4">
            <div className="animate-pulse text-gray-600">checking status...</div>
          </div>
        )}

        {status === 'not ready' && (
          <div className="space-y-6">
            <div className="text-xl text-gray-700">
              not ready yet
            </div>
            <div className="text-gray-500">
              your friend is still chatting with the agent. we'll update this page automatically when their site is ready!
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        )}

        {status === 'ready' && siteUrl && (
          <div className="space-y-6">
            <div className="text-2xl font-semibold text-green-600 mb-4">
              ✓ ready!
            </div>
            <div className="text-gray-700 mb-6">
              your friend's personalized site is ready to view
            </div>
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-black text-white text-lg font-lota lowercase tracking-wide hover:bg-gray-800 transition-colors rounded-sm"
            >
              view site
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
