import type { SiteContent } from '@/lib/types';

interface TemplateAProps {
  content: SiteContent;
  imageIds: string[];
}

export default function TemplateA({ content, imageIds }: TemplateAProps) {
  return (
    <div className="min-h-screen bg-black text-white font-lota">
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-800 to-orange-900">
        <div className="text-center px-6 z-10">
          <h1 className="text-6xl md:text-8xl font-bold mb-4 tracking-tight">
            {content.hero.headline}
          </h1>
          <p className="text-2xl md:text-3xl text-white/90">
            {content.hero.subheadline}
          </p>
        </div>
      </section>

      {/* Interests Grid */}
      <section className="py-20 px-6 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">Interests</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {content.sections.interests.map((interest, i) => (
              <div
                key={i}
                className="bg-gradient-to-br from-purple-600 to-pink-600 p-6 rounded-lg text-center hover:scale-105 transition-transform"
              >
                <p className="text-xl font-semibold">{interest}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hobbies */}
      <section className="py-20 px-6 bg-gray-900">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold mb-12">Hobbies</h2>
          <div className="space-y-6">
            {content.sections.hobbies.map((hobby, i) => (
              <div
                key={i}
                className="bg-gradient-to-r from-orange-600 to-red-600 p-8 rounded-xl"
              >
                <p className="text-2xl">{hobby}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote Section */}
      <section className="py-20 px-6 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <blockquote className="text-3xl md:text-5xl font-bold italic text-white/90 leading-relaxed">
            "{content.quote}"
          </blockquote>
        </div>
      </section>

      {/* Values & Goals */}
      <section className="py-20 px-6 bg-gradient-to-b from-gray-900 to-black">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
          <div>
            <h2 className="text-4xl font-bold mb-8">Values</h2>
            <div className="space-y-4">
              {content.sections.values.map((value, i) => (
                <div key={i} className="bg-pink-600/20 border-l-4 border-pink-600 p-4">
                  <p className="text-xl">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-bold mb-8">Goals</h2>
            <div className="space-y-4">
              {content.sections.goals.map((goal, i) => (
                <div key={i} className="bg-orange-600/20 border-l-4 border-orange-600 p-4">
                  <p className="text-xl">{goal}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-black border-t border-gray-800 text-center">
        <a href="/" className="text-white/60 hover:text-white underline text-sm">
          Delete this page
        </a>
      </footer>
    </div>
  );
}
