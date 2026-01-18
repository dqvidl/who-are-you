'use client';

import React, { useEffect } from 'react';
import type { SiteContent } from '@/lib/types';

interface HardcodedTemplateProps {
  content: SiteContent;
}

export default function HardcodedTemplate({ content }: HardcodedTemplateProps) {
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
          // Set initial state for hero text to ensure it's visible
          gsap.set('.hero-text', {
            opacity: 1,
            scale: 1,
            y: 0,
          });

          // Set initial state for images - start zoomed in, will zoom out
          gsap.set('.hero-image', { scale: 1.4 });
          gsap.set('.content-image-2', { scale: 1.4 });

          // Hero text and image animations - START IMMEDIATELY on scroll, perfectly synced
          // Use window scroll as trigger to start immediately on any scroll
          const heroScrollTrigger = {
            trigger: '.hero',
            start: 'top top',
            end: '+=30%', // Even shorter distance - animation completes very quickly
            scrub: 0.3,
            pin: false,
          };

          // Hero text scale, move up, and fade - synchronized with zoom
          gsap.to('.hero-text', {
            scale: 2.2,
            y: '-30vh',
            opacity: 0,
            ease: 'none',
            scrollTrigger: heroScrollTrigger,
          });

          // Hero image ZOOM OUT effect - EXACT SAME scroll trigger for perfect sync
          gsap.to('.hero-image', {
            scale: 1.0,
            ease: 'none',
            scrollTrigger: heroScrollTrigger,
          });

          // Fade out hero image as bullet points section comes up
          gsap.to('.hero-image', {
            opacity: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: '.bullet-points-section',
              start: 'top bottom+=20%',
              end: 'top center',
              scrub: true,
            },
          });

          // Second image ZOOM OUT effect - start immediately
          gsap.to('.content-image-2', {
            scale: 1.0,
            ease: 'none',
            scrollTrigger: {
              trigger: '.content-image-2-wrapper',
              start: 'top top',
              end: '+=30%',
              scrub: 0.3,
              pin: false,
            },
          });

          // Animate bullet points section coming up - faster, less scrolling
          gsap.utils.toArray('.bullet-points-section').forEach((section: any) => {
            gsap.fromTo(section,
              { y: 40, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                ease: 'power2.out',
                scrollTrigger: {
                  trigger: section,
                  start: 'top bottom-=50px',
                  end: 'top center',
                  scrub: 1,
                },
              }
            );
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

  const name = content.name || 'friend';
  const heroImageUrl = content.heroImageUrl || '/hero.png';
  const heroImageUrl2 = content.heroImageUrl2 || content.heroImageUrl || '/hero.png';
  
  // Use only the second bullet points section (pointFormSection2) - the first one was never visible
  const bulletPoints = content.pointFormSection2 || content.sections?.goals || [];
  
  const heroHeadline = content.hero?.headline?.toLowerCase() || `this is ${name.toLowerCase()}`;
  const heroSubheadline = content.hero?.subheadline?.toLowerCase() || 'who are they?';

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Image 1: Hero section with text */}
      <section className="hero relative h-screen w-full overflow-hidden">
        <div 
          className="hero-image fixed top-0 left-0 w-full h-screen bg-cover bg-center scale-[1.4] origin-center will-change-transform z-0" 
          style={{
            backgroundImage: `url('${heroImageUrl}')`,
          }}
        />
        <div className="fixed inset-0 z-[40] pointer-events-none">
          <h1 className="hero-text absolute top-[12vh] left-1/2 transform -translate-x-1/2 scale-100 origin-center font-lota text-5xl font-normal text-black tracking-wide opacity-100 will-change-opacity text-center leading-tight pointer-events-none">
            {heroHeadline}<br />{heroSubheadline}
          </h1>
        </div>
      </section>

      {/* Scroll spacer for hero zoom effect - minimal scrolling */}
      <div className="scroll-spacer h-[30vh] relative z-[1]" />

      {/* Content container */}
      <div className="content-container relative z-10">
        {/* Bullet points section with "about [name]:" heading - using pointFormSection2 */}
        {bulletPoints.length > 0 && (
          <section className="bullet-points-section min-h-[50vh] flex items-center justify-center px-6 py-16 bg-white relative">
            <div className="max-w-2xl w-full relative z-10">
              <h2 className="font-lota text-2xl text-gray-900 mb-8 text-center">
                about {name.toLowerCase()}:
              </h2>
              <ul className="font-lota text-xl leading-relaxed text-gray-900 space-y-4 text-center">
                {bulletPoints.map((point, index) => (
                  <li key={index} className="flex items-start justify-center">
                    <span className="mr-4 text-gray-500 text-2xl">◆</span>
                    <span className="text-gray-900 font-normal">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Image 2 with zoom out effect - minimal scrolling */}
        <section className="content-image-2-wrapper relative min-h-screen w-full overflow-hidden">
          <div className="scroll-spacer-2 h-[30vh]" />
          <div 
            className="content-image-2 fixed top-0 left-0 w-full h-screen bg-cover bg-center scale-[1.4] origin-center will-change-transform z-0"
            style={{
              backgroundImage: `url('${heroImageUrl2}')`,
            }}
          />
        </section>

        {/* Footer section */}
        <footer className="relative z-10 py-16 px-6 bg-[#fafafa] border-t border-gray-200">
          <div className="max-w-2xl mx-auto">
            {/* Quote section if available */}
            {content.quote && (
              <div className="mb-12 text-center">
                <blockquote className="font-lota text-2xl md:text-3xl text-gray-800 italic leading-relaxed max-w-xl mx-auto">
                  "{content.quote.toLowerCase()}"
                </blockquote>
              </div>
            )}

            {/* Conversation text if available */}
            {content.conversationText && (
              <div className="mb-12 text-center max-w-2xl mx-auto">
                <p className="font-lota text-lg md:text-xl text-gray-700 leading-relaxed whitespace-pre-line">
                  {content.conversationText.toLowerCase()}
                </p>
              </div>
            )}

            {/* Footer links and copyright */}
            <div className="pt-8 border-t border-gray-300 text-center space-y-3">
              <p className="font-lota text-sm text-gray-500">
                {new Date().getFullYear()} © {name.toLowerCase()}
              </p>
              <div className="text-xs text-gray-400">
                <a href="/" className="hover:text-gray-600 underline transition-colors">
                  made with who are you
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}