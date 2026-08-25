import type { NextConfig } from "next";
import { withContentCollections } from "@content-collections/next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/plots",
        destination: "/notes",
        permanent: true,
      },
    ];
  },
};

export default withContentCollections(nextConfig);
