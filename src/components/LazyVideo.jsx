import { useState, useEffect, useRef } from 'react';

const LazyVideo = ({
  src,
  className = '',
  placeholderColor = '#1a1a2e',
  aspectRatio = '1/1',
  autoPlay = false,
  loop = true,
  muted = true,
  playsInline = true,
  onPlayStateChange,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const containerRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        } else if (videoRef.current) {
          // Pause video when out of view to save resources
          videoRef.current.pause();
          setIsPlaying(false);
        }
      },
      {
        rootMargin: '100px',
        threshold: 0.01
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleCanPlay = () => {
    setIsLoaded(true);
    if (videoRef.current && !autoPlay) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0.1; // Show first frame
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    onPlayStateChange?.(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
    onPlayStateChange?.(false);
  };

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio, backgroundColor: placeholderColor }}
    >
      {/* Skeleton placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-dark-surface animate-pulse" />
      )}

      {/* Video */}
      {isInView && (
        <video
          ref={videoRef}
          src={src}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loop={loop}
          muted={muted}
          playsInline={playsInline}
          autoPlay={autoPlay}
          preload="metadata"
          onCanPlay={handleCanPlay}
          onPlay={handlePlay}
          onPause={handlePause}
          onClick={togglePlay}
          onMouseEnter={() => videoRef.current?.play()}
          onMouseLeave={() => {
            if (videoRef.current) {
              videoRef.current.pause();
              videoRef.current.currentTime = 0.1;
            }
          }}
          {...props}
        />
      )}

      {/* Play button overlay */}
      {isLoaded && !isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 rounded-full bg-dark-bg/60 flex items-center justify-center backdrop-blur-sm">
            <div className="w-0 h-0 border-l-[20px] border-l-white border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};

export default LazyVideo;
