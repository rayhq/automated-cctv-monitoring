import React from 'react';

const Skeleton = ({ className, variant = 'rect', width, height }) => {
  const baseClasses = "animate-pulse bg-white/5 rounded";
  
  const variants = {
    rect: "rounded-lg",
    circle: "rounded-full",
    text: "rounded-md"
  };

  const style = {
    width: width || '100%',
    height: height || 'auto'
  };

  return (
    <div 
      className={`${baseClasses} ${variants[variant]} ${className || ''}`}
      style={style}
    ></div>
  );
};

export default Skeleton;
