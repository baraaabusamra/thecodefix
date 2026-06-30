import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The old C# "03-oop" lesson was a condensed duplicate of the dedicated
      // OOP series (12–17). Removed it; send any indexed/inbound links to the
      // canonical classes-and-objects lesson instead of 404ing.
      {
        source: "/learn/csharp/03-oop",
        destination: "/learn/csharp/12-classes-objects",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
