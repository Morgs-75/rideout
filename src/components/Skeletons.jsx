// Reusable skeleton components for loading states

// Base skeleton with shimmer animation
export const Skeleton = ({ className = '', style = {} }) => (
  <div
    className={`bg-dark-surface animate-pulse rounded ${className}`}
    style={style}
  />
);

// Circular skeleton (for avatars)
export const SkeletonCircle = ({ size = 40 }) => (
  <Skeleton
    className="rounded-full flex-shrink-0"
    style={{ width: size, height: size }}
  />
);

// Text line skeleton
export const SkeletonText = ({ width = '100%', height = 16 }) => (
  <Skeleton
    className="rounded"
    style={{ width, height }}
  />
);

// Post card skeleton
export const PostCardSkeleton = () => (
  <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden">
    {/* Header */}
    <div className="p-4 flex items-center gap-3">
      <SkeletonCircle size={40} />
      <div className="flex-1">
        <SkeletonText width={100} height={14} />
        <SkeletonText width={60} height={12} style={{ marginTop: 6 }} />
      </div>
    </div>

    {/* Media */}
    <Skeleton className="aspect-square w-full rounded-none" />

    {/* Actions */}
    <div className="p-4">
      <div className="flex items-center gap-4 mb-3">
        <SkeletonText width={60} height={24} />
        <SkeletonText width={60} height={24} />
        <SkeletonText width={40} height={24} />
      </div>
      <SkeletonText width="80%" height={14} />
      <SkeletonText width="60%" height={14} style={{ marginTop: 8 }} />
    </div>
  </div>
);

// Profile header skeleton
export const ProfileHeaderSkeleton = () => (
  <div className="flex items-start gap-6 mb-6">
    <SkeletonCircle size={80} />
    <div className="flex-1">
      <div className="flex gap-6 mb-3">
        <div className="text-center">
          <SkeletonText width={30} height={20} />
          <SkeletonText width={40} height={12} style={{ marginTop: 4 }} />
        </div>
        <div className="text-center">
          <SkeletonText width={30} height={20} />
          <SkeletonText width={50} height={12} style={{ marginTop: 4 }} />
        </div>
        <div className="text-center">
          <SkeletonText width={30} height={20} />
          <SkeletonText width={50} height={12} style={{ marginTop: 4 }} />
        </div>
      </div>
    </div>
  </div>
);

// Comment skeleton
export const CommentSkeleton = () => (
  <div className="flex gap-3">
    <SkeletonCircle size={32} />
    <div className="flex-1">
      <SkeletonText width={80} height={14} />
      <SkeletonText width="90%" height={12} style={{ marginTop: 6 }} />
      <SkeletonText width={60} height={10} style={{ marginTop: 6 }} />
    </div>
  </div>
);

// Message/Chat skeleton
export const MessageSkeleton = ({ isOwn = false }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
      <Skeleton
        className="rounded-2xl"
        style={{ width: Math.random() * 100 + 100, height: 40 }}
      />
    </div>
  </div>
);

// User list item skeleton
export const UserListSkeleton = () => (
  <div className="flex items-center gap-3 p-3">
    <SkeletonCircle size={48} />
    <div className="flex-1">
      <SkeletonText width={100} height={14} />
      <SkeletonText width={80} height={12} style={{ marginTop: 4 }} />
    </div>
    <SkeletonText width={80} height={32} />
  </div>
);

// Notification skeleton
export const NotificationSkeleton = () => (
  <div className="flex items-center gap-3 p-4 border-b border-dark-border">
    <SkeletonCircle size={44} />
    <div className="flex-1">
      <SkeletonText width="70%" height={14} />
      <SkeletonText width="40%" height={12} style={{ marginTop: 4 }} />
    </div>
    <Skeleton className="w-10 h-10 rounded" />
  </div>
);

// Grid item skeleton (for profile posts grid)
export const GridItemSkeleton = () => (
  <Skeleton className="aspect-square w-full rounded-none" />
);

// Feed skeleton (multiple post cards)
export const FeedSkeleton = ({ count = 3 }) => (
  <div className="space-y-4">
    {Array.from({ length: count }).map((_, i) => (
      <PostCardSkeleton key={i} />
    ))}
  </div>
);

export default {
  Skeleton,
  SkeletonCircle,
  SkeletonText,
  PostCardSkeleton,
  ProfileHeaderSkeleton,
  CommentSkeleton,
  MessageSkeleton,
  UserListSkeleton,
  NotificationSkeleton,
  GridItemSkeleton,
  FeedSkeleton
};
