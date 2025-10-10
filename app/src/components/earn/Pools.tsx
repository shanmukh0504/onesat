"use client";

import { useState } from "react";
import { STATIC_POOL_CARDS } from "@/data/earnData";
import PoolCard from "./PoolCard";
import Pagination from "./Pagination";
import { cn } from "@/lib/utils";

interface PoolsProps {
  className?: string;
}

const Pools: React.FC<PoolsProps> = ({ className }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const totalItems = STATIC_POOL_CARDS.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = STATIC_POOL_CARDS.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section
      className={cn(
        "w-full px-3 xs:px-4 sm:px-6 lg:px-8 py-6 xs:py-8 md:py-12",
        className
      )}
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 xs:gap-5">
          {currentItems.map((poolData) => (
            <PoolCard key={poolData.id} data={poolData} />
          ))}
        </div>
      </div>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </section>
  );
};

export default Pools;
