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

          // Hero text scale and fade
          gsap.to('.hero-text', {
            scale: 2.2,
            y: '-30vh',
            ease: 'none',
            scrollTrigger: {
              trigger: '.hero',
              start: 'top top',
              end: '+=200%',
              scrub: 0.3,
            },
          });

          gsap.to('.hero-text', {
            opacity: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: '.hero',
              start: 'top top',
              end: '+=120%',
              scrub: true,
            },
          });

          // Hero image zoom effect (like landing page) - reduced scroll
          gsap.to('.hero-image', {
            scale: 2.2,
            ease: 'none',
            scrollTrigger: {
              trigger: '.hero',
              start: 'top top',
              end: '+=300%',
              scrub: 0.3,
              pin: false,
            },
          });

          // Fade out hero image as content comes up - faster
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

          // Second image zoom effect - reduced
          gsap.to('.content-image-2', {
            scale: 2.2,
            ease: 'none',
            scrollTrigger: {
              trigger: '.content-image-2',
              start: 'top top',
              end: '+=300%',
              scrub: 0.3,
              pin: false,
            },
          });

          // Animate text sections coming up from bottom
          gsap.utils.toArray('.content-section').forEach((section: any, i: number) => {
            gsap.fromTo(section,
              {
                y: 60,
                opacity: 0,
              },
              {
                y: 0,
                opacity: 1,
                ease: 'power2.out',
                scrollTrigger: {
                  trigger: section,
                  start: 'top bottom-=100px',
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
  const pointFormSection1 = content.pointFormSection1 || content.sections?.hobbies || [];
  const pointFormSection2 = content.pointFormSection2 || content.sections?.goals || [];
  
  // Ensure hero text says "this is [NAME]" all lowercase
  const heroHeadline = content.hero?.headline?.toLowerCase() || `this is ${name.toLowerCase()}`;
  const heroSubheadline = content.hero?.subheadline?.toLowerCase() || 'who are they?';

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Hero section with image and text */}
      <section className="hero relative h-screen w-full overflow-hidden">
        <div 
          className="hero-image fixed top-0 left-0 w-full h-screen bg-cover bg-center scale-100 origin-center will-change-transform z-0" 
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

      {/* Scroll spacer for hero zoom effect - reduced from 400vh to 250vh */}
      <div className="scroll-spacer h-[250vh] relative z-[1]" />

      {/* Content container - scrollable sections */}
      <div className="content-container relative z-10 bg-[#fafafa]">
        {/* First point form section - minimalist, centered text - reduced padding */}
        {pointFormSection1.length > 0 && (
          <section className="content-section min-h-[70vh] flex items-center justify-center px-6 py-16">
            <div className="max-w-2xl w-full">
              <ul className="font-lota text-lg leading-relaxed text-gray-800 space-y-3 text-center">
                {pointFormSection1.map((point, index) => (
                  <li key={index} className="flex items-start justify-center">
                    <span className="mr-3 text-gray-400">◆</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Second image with zoom effect - reduced spacer */}
        <section className="content-image-2-wrapper relative min-h-screen w-full overflow-hidden">
          <div className="scroll-spacer-2 h-[250vh]" />
          <div 
            className="content-image-2 fixed top-0 left-0 w-full h-screen bg-cover bg-center scale-100 origin-center will-change-transform z-0"
            style={{
              backgroundImage: `url('${heroImageUrl2}')`,
            }}
          />
        </section>

        {/* Second point form section - minimalist, centered text - reduced padding */}
        {pointFormSection2.length > 0 && (
          <section className="content-section min-h-[70vh] flex items-center justify-center px-6 py-16 bg-[#fafafa]">
            <div className="max-w-2xl w-full">
              <ul className="font-lota text-lg leading-relaxed text-gray-800 space-y-3 text-center">
                {pointFormSection2.map((point, index) => (
                  <li key={index} className="flex items-start justify-center">
                    <span className="mr-3 text-gray-400">◆</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Footer section - inspired by david-portfolio */}
        <footer className="relative z-10 py-16 px-6 bg-[#fafafa] border-t border-gray-200">
          <div className="max-w-2xl mx-auto">
            {/* Quote section if available */}
            {content.quote && (
              <div className="mb-12 text-center">
                <blockquote className="font-lota text-xl md:text-2xl text-gray-700 italic leading-relaxed">
                  "{content.quote.toLowerCase()}"
                </blockquote>
              </div>
            )}

            {/* Conversation text if available */}
            {content.conversationText && (
              <div className="mb-12 text-center max-w-xl mx-auto">
                <p className="font-lota text-base md:text-lg text-gray-600 leading-relaxed whitespace-pre-line">
                  {content.conversationText.toLowerCase()}
                </p>
              </div>
            )}

            {/* Footer links and copyright */}
            <div className="pt-8 border-t border-gray-200 text-center">
              <div className="mb-4">
                <p className="font-lota text-sm text-gray-500">
                  {new Date().getFullYear()} © {name.toLowerCase()}
                </p>
              </div>
              <div className="text-xs text-gray-400">
                <a href="/" className="hover:text-gray-600 underline">
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