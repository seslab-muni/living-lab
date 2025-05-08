import Image from 'next/image';
export default function Profile() {
  return (
    <Image
      src="/profile.jpg"
      alt="My profile photo"
      width={200}
      height={200}
      style={{ borderRadius: '10%' }}
    />
  );
}
