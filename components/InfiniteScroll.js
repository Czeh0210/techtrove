'use client';

import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { Observer } from 'gsap/Observer';

gsap.registerPlugin(Observer);

export default function InfiniteScroll({
  width = '30rem',
  maxHeight = '100%',
  negativeMargin = '-0.5em',
  items = [],
  itemMinHeight = 150,
  itemMinWidth = 300,
  isTilted = false,
  tiltDirection = 'left',
  autoplay = false,
  autoplaySpeed = 0.5,
  autoplayDirection = 'down', // 'down', 'up', 'right', 'left'
  pauseOnHover = false,
  direction = 'vertical' // 'vertical' or 'horizontal'
}) {
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);

  const getTiltTransform = () => {
    if (!isTilted) return 'none';
    return tiltDirection === 'left'
      ? 'rotateX(20deg) rotateZ(-20deg) skewX(20deg)'
      : 'rotateX(20deg) rotateZ(20deg) skewX(-20deg)';
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (items.length === 0) return;

    const divItems = gsap.utils.toArray(container.children);
    if (!divItems.length) return;

    const isHorizontal = direction === 'horizontal';
    
    const firstItem = divItems[0];
    const itemStyle = getComputedStyle(firstItem);
    const itemSize = isHorizontal ? firstItem.offsetWidth : firstItem.offsetHeight;
    const itemMargin = isHorizontal ? parseFloat(itemStyle.marginLeft) || 0 : parseFloat(itemStyle.marginTop) || 0;
    const totalItemSize = itemSize + itemMargin;
    const totalSize = totalItemSize * items.length;

    const wrapFn = gsap.utils.wrap(-totalSize, totalSize);

    // Set initial positions - DON'T make them absolutely positioned, keep relative flow
    divItems.forEach((child, i) => {
      const position = i * totalItemSize;
      
      if (isHorizontal) {
        gsap.set(child, { x: position });
      } else {
        gsap.set(child, { y: position });
      }
    });

    const observer = Observer.create({
      target: container,
      type: 'wheel,touch,pointer',
      preventDefault: true,
      onPress: ({ target }) => {
        target.style.cursor = 'grabbing';
      },
      onRelease: ({ target }) => {
        target.style.cursor = 'grab';
      },
      onChange: ({ deltaX, deltaY, isDragging, event }) => {
        const delta = isHorizontal ? deltaX : deltaY;
        const d = event.type === 'wheel' ? -delta : delta;
        const distance = isDragging ? d * 5 : d * 10;
        
        divItems.forEach(child => {
          gsap.to(child, {
            duration: 0.5,
            ease: 'expo.out',
            [isHorizontal ? 'x' : 'y']: `+=${distance}`,
            modifiers: {
              [isHorizontal ? 'x' : 'y']: gsap.utils.unitize(wrapFn)
            }
          });
        });
      }
    });

    let rafId;
    if (autoplay) {
      let directionFactor = 1;
      if (isHorizontal) {
        directionFactor = autoplayDirection === 'right' ? 1 : -1;
      } else {
        directionFactor = autoplayDirection === 'down' ? 1 : -1;
      }
      const speedPerFrame = autoplaySpeed * directionFactor;

      const tick = () => {
        divItems.forEach(child => {
          gsap.set(child, {
            [isHorizontal ? 'x' : 'y']: `+=${speedPerFrame}`,
            modifiers: {
              [isHorizontal ? 'x' : 'y']: gsap.utils.unitize(wrapFn)
            }
          });
        });
        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);

      if (pauseOnHover) {
        const stopTicker = () => rafId && cancelAnimationFrame(rafId);
        const startTicker = () => (rafId = requestAnimationFrame(tick));

        container.addEventListener('mouseenter', stopTicker);
        container.addEventListener('mouseleave', startTicker);

        return () => {
          observer.kill();
          stopTicker();
          container.removeEventListener('mouseenter', stopTicker);
          container.removeEventListener('mouseleave', startTicker);
        };
      } else {
        return () => {
          observer.kill();
          rafId && cancelAnimationFrame(rafId);
        };
      }
    }

    return () => {
      observer.kill();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [items, autoplay, autoplaySpeed, autoplayDirection, pauseOnHover, isTilted, tiltDirection, negativeMargin, direction]);

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      className="relative flex items-center justify-center w-full overflow-hidden"
      ref={wrapperRef}
      style={{ 
        maxHeight: isHorizontal ? maxHeight : maxHeight, 
        maxWidth: '100%',
        height: isHorizontal ? maxHeight : 'auto'
      }}
    >
      {/* Gradient fades */}
      {isHorizontal ? (
        <>
          <div className="absolute top-0 left-0 h-full w-1/4 bg-gradient-to-r from-blue-50/80 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute top-0 right-0 h-full w-1/4 bg-gradient-to-l from-blue-50/80 to-transparent z-10 pointer-events-none"></div>
        </>
      ) : (
        <>
          <div className="absolute top-0 left-0 w-full h-1/4 bg-gradient-to-b from-blue-50/80 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-blue-50/80 to-transparent z-10 pointer-events-none"></div>
        </>
      )}

      <div
        className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} overscroll-contain ${isHorizontal ? 'py-4' : 'px-4'} cursor-grab origin-center`}
        ref={containerRef}
        style={{
          width: isHorizontal ? 'max-content' : width,
          height: isHorizontal ? maxHeight : 'auto',
          transform: getTiltTransform(),
          minHeight: isHorizontal ? maxHeight : `${itemMinHeight * Math.min(items.length, 3)}px`,
          minWidth: isHorizontal ? `${itemMinWidth * Math.min(items.length, 3)}px` : 'auto'
        }}
      >
        {items.map((item, i) => (
          <div
            className="select-none box-border flex-shrink-0"
            key={i}
            style={{
              height: isHorizontal ? maxHeight : 'auto',
              width: isHorizontal ? `${itemMinWidth}px` : '100%',
              minHeight: isHorizontal ? maxHeight : `${itemMinHeight}px`,
              minWidth: isHorizontal ? `${itemMinWidth}px` : 'auto',
              marginTop: !isHorizontal && i !== 0 ? negativeMargin : '0',
              marginLeft: isHorizontal && i !== 0 ? negativeMargin : '0'
            }}
          >
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
}
