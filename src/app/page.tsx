"use client";

import { useState } from "react";
import { ProductFeed } from "@/components/product-feed";
import { AddUrlModal } from "@/components/add-url-modal";

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">신제품 피드</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          + URL 추가
        </button>
      </div>
      <div className="mt-6">
        <ProductFeed />
      </div>
      <AddUrlModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
