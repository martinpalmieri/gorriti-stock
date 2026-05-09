import Image from "next/image";

export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/brand/gorriti.png"
        alt="Gorriti"
        width={96}
        height={96}
        priority
        className="rounded-sm"
      />
    </div>
  );
}
