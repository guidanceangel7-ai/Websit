import React from "react";
import Marquee from "react-fast-marquee";
import { Star, Overline } from "./Decor";

/* ── Your real client testimonials — shown as fallback when API is empty ── */
const REAL_REVIEWS = [
  {
    id: "r1", author: "Sakshi Sajwan", rating: 5, source: "Google",
    content: "It was excellent experience of Akashic reading. I came to realise some important things and patterns which I need to break in this life. Thank you for helping and answering me that which part I actually need to rectify in my life. Lots of wishes to you 💕",
  },
  {
    id: "r2", author: "Aadishree Deka", rating: 5, source: "Google",
    content: "I liked everything about Jenika and her video session. Most importantly her every guidance is so useful. And the most important part is these sessions are being recorded which is great — in future we can access these videos and take guidance.",
  },
  {
    id: "r3", author: "Ritu Gour", rating: 5, source: "Google",
    content: "If a person's last hope is also vanished then you are the ray of hope so he will revive and survive with that... Excellent, highly recommended. Thank you so much for your guidance 🙏❤️",
  },
  {
    id: "r4", author: "Divyangi Arora", rating: 5, source: "Google",
    content: "I want to express my deepest gratitude for the incredible insights and guidance you've shared through our sessions. Your ability to tap into the Akashic records has provided me with profound clarity and understanding, helping me grow on my journey ❤️",
  },
  {
    id: "r5", author: "Sejal Parmar", rating: 5, source: "Google",
    content: "Words can't express that feeling I felt during the session. The minute we started I felt peaceful — each detail was so accurate, so many things became clear, and most importantly the energy we shared during the session is incomparable. Thank you so much universe.",
  },
  {
    id: "r6", author: "Shrsiti", rating: 5, source: "Google",
    content: "I am so happy to get my akashic reading done from Jeni. She is such a great soul. She has not just given me insights of my past life but also helped me with the tricks on how to heal them. She tapped on my current energies so well and told me things that only I am aware of. I am glad I chose her.",
  },
  {
    id: "r7", author: "Nehha Verma", rating: 5, source: "Google",
    content: "Thank you dear Jeni for an amazing Akashic session whereby you listened to all my concerns very patiently and answered them properly with solutions. Also you helped me find the root cause of the pattern that I am facing. Thank you so much from the bottom of my heart 🙏🏻",
  },
  {
    id: "r8", author: "Sneha Vilas Kakad", rating: 5, source: "Google",
    content: "Thank you so much. Your whole session gives me a positive energy. I just love the way you explain each and every thing about my past and my present situation. Today when I was talking with you all my things were getting clear.",
  },
  {
    id: "r9", author: "Khushboo Sahrawat", rating: 5, source: "WhatsApp",
    content: "I am able to understand my patterns better. Beyond thankful — you told me about my grandfather being my spirit guide. I have felt so much at peace. You gave me clarity. I feel so so blessed about taking the reading from you. It reminded me of my strengths and who I am. Thank you, thank you, thank you ❤️✨",
  },
  {
    id: "r10", author: "Ritee Chanababa", rating: 5, source: "WhatsApp",
    content: "Very impressive work 🥰 When I wasn't sure what to do about something, when I had a lot of changes going on in my life, and just when I was feeling like I needed a little guidance — every single time you give me exactly what I need, whether it's encouragement or course corrections. God bless 😇",
  },
  {
    id: "r11", author: "Khushali Manoj Bohra", rating: 5, source: "WhatsApp",
    content: "You had told me that me and Aashish were soulmates in past life and we had very good married lives! Yesterday both of us got the same dream about being soulmates in the past life 😍😍 You were sooooo accurate about it!",
  },
  {
    id: "r12", author: "Anikta Gupta", rating: 5, source: "WhatsApp",
    content: "I am so grateful that you were my guide in learning Akasha. The way you have made everything so easy to understand and access — you are the best teacher ever. You are my guiding light in my journey of spirituality and I feel blessed 🌻❤️",
  },
  {
    id: "r13", author: "Pranoti Raut", rating: 5, source: "Google",
    content: "The accuracy of your readings and how you straight away got into it and predicted things all by yourself — and gave effective and realistic solutions while being practical about the situation.",
  },
  {
    id: "r14", author: "Rutuja Bankar", rating: 5, source: "Google",
    content: "Thank you Jenika for a wonderful session. So many things which you told me were right.",
  },
  {
    id: "r15", author: "Dr Norin Thakkar", rating: 5, source: "WhatsApp",
    content: "Thank you so much. You have been an excellent teacher and your explanation was crisp and to the point. We enjoyed and learned a lot. I am glad that you are our mentor ❤️😘",
  },
  {
    id: "r16", author: "Payal Punjabi", rating: 5, source: "WhatsApp",
    content: "You told me in akashic reading that I will get a new opportunity... I got the opportunity and will be joining a school soon. Your push to start working made me join as a teacher in summer camp and they offered me to join their school. Thank you!",
  },
];

function TestimonialCard({ t }) {
  return (
    <div
      data-testid={`testimonial-${t.id}`}
      className="mx-3 w-[340px] sm:w-[380px] flex-shrink-0 rounded-3xl bg-white/85 border border-peach/25 px-6 py-7 shadow-soft"
    >
      <div className="flex items-center gap-1 text-peach">
        {Array.from({ length: t.rating || 5 }).map((_, i) => (
          <Star key={`${t.id}-star-${i}`} size={14} />
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink-plum/85 line-clamp-6 font-display italic">
        &ldquo;{t.content}&rdquo;
      </p>
      <div className="mt-5 flex items-center justify-between">
        <div>
          <div className="font-display text-base text-lavender-deep">{t.author}</div>
          {t.source && (
            <div className="text-[10px] uppercase tracking-[0.22em] text-peach-deep mt-1">
              via {t.source}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Testimonials({ items }) {
  // Use live data from API if provided and non-empty, else show real reviews
  const reviews = (items && items.length > 0) ? items : REAL_REVIEWS;

  if (!reviews || reviews.length === 0) return null;

  return (
    <section
      id="testimonials"
      data-testid="testimonials-section"
      className="relative py-20 sm:py-28 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-12 mb-12">
        <div className="max-w-3xl">
          <Overline>Stories From Souls</Overline>
          <h2
            data-testid="testimonials-heading"
            className="font-display mt-4 text-4xl sm:text-5xl text-ink-plum leading-[1.08] tracking-tight"
          >
            <span className="italic text-lavender-deep">Loved</span> by 5,000+
            seekers across the world.
          </h2>
          <p className="mt-5 text-base sm:text-lg text-ink-plum/75 leading-relaxed">
            With 200+ five-star Google reviews and 1,000+ glowing Instagram
            stories, here are a few experiences shared straight from the heart.
          </p>
        </div>
      </div>

      {/* Row 1 — left to right */}
      <Marquee gradient gradientColor="#FBF4E8" gradientWidth={80} speed={32} pauseOnHover>
        {reviews.map((t) => (
          <TestimonialCard key={t.id} t={t} />
        ))}
      </Marquee>

      {/* Row 2 — right to left */}
      <div className="mt-6">
        <Marquee
          gradient
          gradientColor="#FBF4E8"
          gradientWidth={80}
          speed={28}
          direction="right"
          pauseOnHover
        >
          {[...reviews].reverse().map((t) => (
            <TestimonialCard key={`r-${t.id}`} t={t} />
          ))}
        </Marquee>
      </div>
    </section>
  );
}
