import Image from 'next/image';
export default function ProfilePicture() {
  return (
    <Image
      src="/profile.jpg"
      alt="My profile photo"
      width={200}
      height={200}
      priority={true}
      style={{ borderRadius: '10%' }}
    />
  );
}
