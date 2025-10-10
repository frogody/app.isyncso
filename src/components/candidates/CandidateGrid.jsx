import React from "react";
import { motion } from "framer-motion";
import CandidateCard from "./CandidateCard";

export default React.memo(function CandidateGrid({ candidates }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {candidates.map((candidate, index) => (
        <motion.div
          key={candidate.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <CandidateCard candidate={candidate} />
        </motion.div>
      ))}
    </div>
  );
});