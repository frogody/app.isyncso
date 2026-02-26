export default function SubStepIndicator({ current, total = 5 }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isCompleted = step < current;

        return (
          <div
            key={step}
            className={`
              w-2 h-2 rounded-full transition-all duration-200
              ${isActive
                ? 'w-6 bg-yellow-400'
                : isCompleted
                  ? 'bg-yellow-400/50'
                  : 'bg-zinc-700'
              }
            `}
          />
        );
      })}
    </div>
  );
}
