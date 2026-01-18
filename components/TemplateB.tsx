import type { SiteContent } from '@/lib/types';

interface TemplateBProps {
  content: SiteContent;
  imageIds: string[];
}

export default function TemplateB({ content, imageIds }: TemplateBProps) {
  return (
    <div className="min-h-screen bg-[#fafafa] text-gray-900 font-lota">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-b from-[#f5f5f5] to-white px-6">
        <div className="text-center max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-light mb-6 tracking-wide text-gray-800">
            {content.hero.headline}
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 font-light">
            {content.hero.subheadline}
          </p>
        </div>
      </section>

      {/* Vertical Layout - Interests */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-light mb-12 text-gray-700">Interests</h2>
          <div className="space-y-6">
            {content.sections.interests.map((interest, i) => (
              <div key={i} className="border-b border-gray-200 pb-6">
                <p className="text-xl text-gray-800">{interest}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote */}
      <section className="py-20 px-6 bg-[#fafafa]">
        <div className="max-w-3xl mx-auto">
          <blockquote className="text-2xl md:text-3xl font-light italic text-gray-700 leading-relaxed border-l-4 border-gray-300 pl-8">
            {content.quote}
          </blockquote>
        </div>
      </section>

      {/* Hobbies */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-light mb-12 text-gray-700">Hobbies</h2>
          <div className="space-y-8">
            {content.sections.hobbies.map((hobby, i) => (
              <div key={i} className="text-lg text-gray-800">
                {hobby}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-6 bg-[#fafafa]">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-light mb-12 text-gray-700">What Matters</h2>
          <div className="space-y-6">
            {content.sections.values.map((value, i) => (
              <div key={i} className="text-xl text-gray-800">
                {value}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Goals */}
      <section className="py-16 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-light mb-12 text-gray-700">Goals</h2>
          <div className="space-y-6">
            {content.sections.goals.map((goal, i) => (
              <div key={i} className="text-xl text-gray-800">
                {goal}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-[#fafafa] border-t border-gray-200 text-center">
        <a href="/" className="text-gray-500 hover:text-gray-700 underline text-sm">
          Delete this page
        </a>
      </footer>
    </div>
  );
}
