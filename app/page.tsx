'use client';

import React, { useState, useEffect } from 'react';

export default function Home() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [statusUrl, setStatusUrl] = useState<string | null>(null);
  const [siteUrl, setSiteUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/submit-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSubmitted(true);
        setSessionId(data.sessionId || null);
        setSiteId(data.siteId || null);
        setStatusUrl(data.statusUrl || null);
        setSiteUrl(data.siteUrl || null);
        setReady(data.ready || false);
      } else {
        alert(data.error || 'Failed to submit phone number');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to submit phone number');
    } finally {
      setLoading(false);
    }
  };

  // Set up GSAP animations on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ctx: any = null;

    // Dynamically import GSAP on client side
    const initGSAP = async () => {
      try {
        const gsapModule = await import('gsap');
        const gsap = gsapModule.default;
        const { ScrollTrigger } = await import('gsap/ScrollTrigger');

        gsap.registerPlugin(ScrollTrigger);

        // Create a context for cleanup
        ctx = gsap.context(() => {
          // Scale up "who are you" text as background zooms in
          gsap.to('.hero-text', {
            scale: 2.2,
            y: '-30vh',
            ease: 'none',
            scrollTrigger: {
              trigger: '.hero',
              start: 'top top',
              end: '+=250%',
              scrub: 0.3,
            },
          });

          // Fade out "who are you" text as you scroll down
          gsap.to('.hero-text', {
            opacity: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: '.hero',
              start: 'top top',
              end: '+=150%',
              scrub: true,
            },
          });

          // Hero zoom-in effect
          gsap.to('.hero-image', {
            scale: 2.2,
            ease: 'none',
            scrollTrigger: {
              trigger: '.hero',
              start: 'top top',
              end: '+=400%',
              scrub: 0.3,
              pin: false,
            },
          });

          // Fade in phone section
          gsap.to('.phone-section', {
            opacity: 1,
            ease: 'none',
            scrollTrigger: {
              trigger: '.scroll-spacer',
              start: 'top 20%',
              end: 'bottom 80%',
              scrub: true,
            },
          });

          // Fade out hero as phone section scales up
          gsap.to('.hero-image', {
            opacity: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: '.scroll-spacer',
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          });
        });
      } catch (error) {
        console.error('GSAP initialization error:', error);
      }
    };

    initGSAP();

    return () => {
      if (ctx) ctx.revert();
    };
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero section with zoom-out effect */}
      <section className="hero relative h-screen w-full overflow-hidden">
        <div className="hero-image fixed top-0 left-0 w-full h-screen bg-cover bg-center bg-[url('/hero.png')] scale-100 origin-center will-change-transform z-0" />
        <h1 className="hero-text fixed top-[12vh] left-1/2 transform -translate-x-1/2 scale-100 origin-center font-lota text-5xl font-normal text-black tracking-wide z-[5] opacity-100 will-change-opacity text-center leading-tight">
          i have to ask.<br />who are you?
        </h1>
      </section>

      {/* Scroll spacer to create scroll distance */}
      <div className="scroll-spacer h-[250vh] relative z-[1]" />

      {/* Off-white section with phone input */}
      <section className="phone-section fixed top-0 left-0 w-screen h-screen bg-[#f5f5f5] z-20 flex items-center justify-center p-10 will-change-opacity opacity-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundRepeat: 'repeat',
        }}
      >
        <div className="phone-section-inner max-w-[600px] w-full">
          {submitted ? (
            <div className="text-center space-y-6">
              <h2 className="font-lota text-2xl text-gray-800 mb-4">thanks!</h2>
              
              <div className="space-y-4">
                {statusUrl && (
                  <div>
                    <div className="mb-4">
                      <a
                        href={statusUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline font-lota lowercase tracking-wide"
                      >
                        check status
                      </a>
                    </div>
                    
                    {ready && siteId ? (
                      <div className="space-y-2">
                        <div className="text-green-600 font-lota lowercase">status: ready</div>
                        <a
                          href={`/site/${siteId}`}
                          className="inline-block mt-4 px-6 py-3 bg-black text-white font-lota lowercase tracking-wide hover:bg-gray-800 transition-colors"
                        >
                          view site
                        </a>
                        <div className="text-xs text-gray-500 font-lota lowercase mt-2">
                          http://localhost:3000/site/{siteId}
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-600 font-lota lowercase">status: not ready yet</div>
                    )}
                  </div>
                )}
                
                <p className="font-lota text-sm text-gray-500">
                  we've sent a message to your friend. check the status link above to see when their site is ready!
                </p>
              </div>
            </div>
          ) : (
            <>
              <label htmlFor="phone-input" className="phone-label block font-lota text-base text-gray-800 mb-3 lowercase tracking-wide">
                phone number of a friend
              </label>
              <form onSubmit={handleSubmit}>
                <input
                  type="tel"
                  id="phone-input"
                  className="phone-input w-full font-lota text-2xl text-black bg-transparent border-b-2 border-gray-800 py-3 outline-none transition-colors focus:border-black placeholder:text-gray-400 placeholder:opacity-60"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="submit"
                  className="phone-submit mt-6 font-lota text-base text-gray-800 bg-transparent border-none border-b-2 border-gray-800 py-3 cursor-pointer lowercase tracking-wide transition-colors hover:border-black hover:text-black disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'submitting...' : 'submit'}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
