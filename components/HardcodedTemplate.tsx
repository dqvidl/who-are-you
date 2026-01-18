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
          // Hero text scale and fade
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

          // Hero image zoom effect (like landing page)
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

          // Fade out hero image as content comes up
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

          // Second image zoom effect
          gsap.to('.content-image-2', {
            scale: 2.2,
            ease: 'none',
            scrollTrigger: {
              trigger: '.content-image-2',
              start: 'top top',
              end: '+=400%',
              scrub: 0.3,
              pin: false,
            },
          });

          // Animate text sections coming up from bottom
          gsap.utils.toArray('.content-section').forEach((section: any, i: number) => {
            gsap.fromTo(section,
              {
                y: 80,
                opacity: 0,
              },
              {
                y: 0,
                opacity: 1,
                ease: 'power2.out',
                scrollTrigger: {
                  trigger: section,
                  start: 'top bottom-=150px',
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
  const heroHeadline = content.hero?.headline || `this is ${name}.`;
  const heroSubheadline = content.hero?.subheadline || 'who are they?';

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
        <h1 className="hero-text fixed top-[12vh] left-1/2 transform -translate-x-1/2 scale-100 origin-center font-lota text-5xl font-normal text-black tracking-wide z-[5] opacity-100 will-change-opacity text-center leading-tight">
          {heroHeadline}<br />{heroSubheadline}
        </h1>
      </section>

      {/* Scroll spacer for hero zoom effect */}
      <div className="scroll-spacer h-[400vh] relative z-[1]" />

      {/* Content container - scrollable sections */}
      <div className="content-container relative z-10 bg-[#fafafa]">
        {/* First point form section - minimalist, centered text */}
        {pointFormSection1.length > 0 && (
          <section className="content-section min-h-screen flex items-center justify-center px-6 py-20">
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

        {/* Second image with zoom effect */}
        <section className="content-image-2-wrapper relative min-h-screen w-full overflow-hidden">
          <div className="scroll-spacer-2 h-[400vh]" />
          <div 
            className="content-image-2 fixed top-0 left-0 w-full h-screen bg-cover bg-center scale-100 origin-center will-change-transform z-0"
            style={{
              backgroundImage: `url('${heroImageUrl2}')`,
            }}
          />
        </section>

        {/* Second point form section - minimalist, centered text */}
        {pointFormSection2.length > 0 && (
          <section className="content-section min-h-screen flex items-center justify-center px-6 py-20 bg-[#fafafa]">
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
      </div>
    </div>
  );
}