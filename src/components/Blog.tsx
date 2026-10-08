import { useState } from "react";
import { ArrowRight, Calendar, User, X, BookOpen, ArrowUpRight, Leaf } from "lucide-react";
import { BlogPost } from "../types";
import { BLOG_POSTS } from "../data";
import { handleImageError, resolveBlogImage } from "../utils/imageMatching";
import MarkdownArticleRenderer from "./MarkdownArticleRenderer";

interface BlogProps {
  onSelectPost?: (post: BlogPost) => void;
  postsList?: BlogPost[];
  isHomepage?: boolean;
  onViewAllBlogs?: () => void;
}

export default function Blog({
  onSelectPost,
  postsList = BLOG_POSTS,
  isHomepage = false,
  onViewAllBlogs,
}: BlogProps) {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const getPostImage = (post: BlogPost) => {
    return resolveBlogImage(post);
  };

  const handleOpenPost = (post: BlogPost) => {
    if (onSelectPost) {
      onSelectPost(post);
    } else {
      setSelectedPost(post);
      // Smoothly scroll user to the top when opening an article
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // If on homepage, display featured blogs (up to 6)
  let displayPosts = postsList;
  if (isHomepage) {
    const featured = postsList.filter((b) => (b as any).isFeaturedHome);
    if (featured.length > 0) {
      displayPosts = featured.slice(0, 6);
    } else {
      displayPosts = postsList.slice(0, 3);
    }
  }

  const handleClosePost = () => {
    setSelectedPost(null);
    // Smoothly scroll back to the blog section anchor
    setTimeout(() => {
      const blogSection = document.getElementById("blog-section");
      if (blogSection) {
        blogSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 50);
  };

  if (selectedPost) {
    const selectedImg = getPostImage(selectedPost);
    return (
      <div className="animate-fadeIn min-h-screen bg-[#f7f9f4] flex flex-col font-sans pb-20 text-[#5b6b55]">
        {/* Reader Top Bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-[#e1e8db] z-30 px-4 sm:px-8 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button
              onClick={handleClosePost}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#e1e8db] hover:border-[#3b142e] bg-white text-xs font-bold font-mono text-[#5b6b55] hover:text-[#2c3527] transition-all duration-300 cursor-pointer"
            >
              ← Back to Blog
            </button>
            <span className="text-[10px] sm:text-xs font-mono text-[#3b142e] font-bold uppercase tracking-widest">
              Currently Reading • {selectedPost.category}
            </span>
            <button
              onClick={handleClosePost}
              className="w-10 h-10 rounded-full border border-[#e1e8db] hover:border-[#3b142e] bg-white text-[#5b6b55] hover:text-[#2c3527] flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
              title="Close article"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero Header Area - Clean White Reader Design */}
        <div className="max-w-4xl mx-auto w-full px-6 pt-8 pb-4 space-y-6">
          {selectedImg && (
            <div className="w-full rounded-2xl overflow-hidden border border-[#e1e8db] bg-[#f7f9f4] shadow-xs">
              <img
                src={selectedImg}
                alt={selectedPost.title}
                className="w-full h-auto max-h-[500px] object-cover object-center block rounded-2xl"
                onError={(e) => {
                  const container = (e.target as HTMLElement).parentElement;
                  if (container) container.style.display = "none";
                }}
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="space-y-3">
            <span className="inline-block bg-[#3b142e] text-white text-[10px] font-mono font-black px-3 py-1 rounded-sm uppercase tracking-widest">
              {selectedPost.category}
            </span>
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-black text-[#2c3527] leading-tight tracking-tight">
              {selectedPost.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#72856a] font-mono pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#3b142e]" />
                <span>Published on {selectedPost.date}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#3b142e]" />
                <span>Authored by {selectedPost.author}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Core Content Reading Desk */}
        <div className="max-w-3xl mx-auto px-6 py-12 sm:py-16 space-y-8 flex-grow">
          <div className="text-[#5b6b55] leading-relaxed font-sans text-base sm:text-lg space-y-6">
            {/* Highlight summary */}
            <p className="font-bold text-[#2c3527] italic border-l-4 border-[#3b142e] pl-5 text-base sm:text-xl md:text-2xl mb-8 py-4 bg-white border-y border-r border-[#e1e8db] rounded-r-xl pr-5 leading-normal shadow-sm">
              {selectedPost.summary}
            </p>

            {/* Full Markdown Article Content */}
            <MarkdownArticleRenderer content={selectedPost.content} />
          </div>

          {/* Disclaimer feedback desk */}
          <div className="pt-8 border-t border-[#e1e8db] mt-12 bg-white rounded-2xl p-6 border border-[#e1e8db] space-y-3 shadow-sm">
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#c49b1a] block uppercase animate-pulse">
              REGULATORY SATISFACTION STATEMENT
            </span>
            <p className="text-xs text-[#72856a] font-sans leading-relaxed">
              *Disclaimer: To explore more customized support matching your
              physical goals, visit our storefront in Hurst, TX. Our
              well-trained, passionate experts can answer
              cannabinoid metrics on purity, legal thresholds, and sublingual
              infusion techniques so you feel fully comfortable. Always consult
              with a licensed healthcare practitioner before incorporating new
              botanical extracts into daily wellness protocols.
            </p>
          </div>

          {/* Bottom Navigation close actions */}
          <div className="pt-12 border-t border-[#e1e8db] flex flex-col sm:flex-row gap-4 items-center justify-between text-xs font-mono text-[#72856a] mt-12">
            <span>
              © 2026 CBD American Shaman of Hurst • Hurst, TX
            </span>
            <button
              onClick={handleClosePost}
              className="w-full sm:w-auto px-8 py-3 rounded-full border border-[#e1e8db] hover:border-[#3b142e] bg-white font-bold text-[#5b6b55] hover:text-[#2c3527] uppercase tracking-wider transition-all duration-300 cursor-pointer"
            >
              Back to Articles list
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section
      id="blog-section"
      className="py-12 sm:py-16 bg-[#f7f9f4] font-sans"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
        {/* Header Title */}
        <div className="text-center space-y-2.5 max-w-2xl mx-auto">
          <p className="text-[11px] font-mono tracking-widest text-[#3b142e] uppercase font-bold">
            EDUCATIONAL JOURNAL
          </p>
          <h2 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-[#2c3527]">
            News & <span className="text-[#3b142e]">Articles</span>
          </h2>
          <p className="text-[#5b6b55] text-xs sm:text-sm">
            Read medical insights, dosage guidance charts, cannabinoid
            comparisons, and state compliance reports compiled by our experts.
          </p>
        </div>

        {/* Blog Post Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {displayPosts.map((post) => {
            const postImg = getPostImage(post);
            const hasImage = !!postImg;

            return (
              <div
                key={post.id}
                onClick={() => handleOpenPost(post)}
                className="group rounded-2xl overflow-hidden bg-white border border-[#e1e8db] cursor-pointer hover:border-[#3b142e] hover:shadow-xl transition-all duration-300 flex flex-col shadow-xs hover:-translate-y-1"
              >
                {/* Cover Image Stage - ONLY rendered if post has a verified image */}
                {hasImage && (
                  <div className="relative w-full aspect-[16/9] overflow-hidden border-b border-[#e1e8db] shrink-0 bg-[#f7f9f4]">
                    <img
                      src={postImg}
                      alt={post.title}
                      className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
                      onError={(e) => {
                        const container = (e.target as HTMLElement).parentElement;
                        if (container) container.style.display = "none";
                      }}
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-3 left-3 z-10 bg-[#3b142e] text-white text-[9px] font-mono font-bold px-2.5 py-1 rounded uppercase tracking-wider shadow-sm">
                      {post.category}
                    </span>
                  </div>
                )}

                {/* Text Description Content */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between font-sans">
                  <div className="space-y-3">
                    {/* If post has NO image, show category badge cleanly here */}
                    {!hasImage && (
                      <div className="flex items-center justify-between">
                        <span className="bg-[#3b142e] text-white text-[9px] font-mono font-bold px-2.5 py-1 rounded uppercase tracking-wider">
                          {post.category}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-[#72856a] font-mono">
                          <Calendar className="w-3 h-3 text-[#3b142e]" />
                          <span>{post.date}</span>
                        </div>
                      </div>
                    )}

                    {hasImage && (
                      <div className="flex items-center gap-1.5 text-[10px] text-[#72856a] font-mono">
                        <Calendar className="w-3 h-3 text-[#3b142e]" />
                        <span>{post.date}</span>
                      </div>
                    )}

                    <h3 className="text-lg sm:text-xl font-serif font-black text-[#2c3527] group-hover:text-[#3b142e] transition-colors line-clamp-2 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-xs text-[#72856a] line-clamp-3 leading-relaxed">
                      {post.summary}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#edf2e8] mt-4 flex items-center justify-between text-xs text-[#3b142e] font-bold uppercase tracking-wider group-hover:text-[#5d8021] transition-colors">
                    <span>Read Article</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* View All Articles button on Homepage */}
        {isHomepage && onViewAllBlogs && (
          <div className="text-center pt-2">
            <button
              onClick={onViewAllBlogs}
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#3b142e] hover:bg-[#5d2a49] text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-300 shadow-md cursor-pointer hover:shadow-lg"
            >
              <span>View All Articles & Guides</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
