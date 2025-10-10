import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function CountdownTimer({ targetDate, user }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft(user?.language === 'nl' ? 'Nu' : 'Now');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}u`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}u ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [targetDate, user]);

  return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(233, 240, 241, 0.5)' }}>
      <Clock className="w-3 h-3" />
      <span>{user?.language === 'nl' ? 'Check over' : 'Check in'} {timeLeft}</span>
    </div>
  );
}