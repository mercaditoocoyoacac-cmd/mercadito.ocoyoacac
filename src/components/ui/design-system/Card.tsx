"use client";

import { forwardRef, type ReactNode, type HTMLAttributes } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

export interface CardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  variant?: "default" | "elevated" | "outlined" | "ghost";
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
  asChild?: boolean;
  children?: ReactNode;
}

const variantClasses = {
  default: "bg-white border border-[var(--border)] shadow-sm",
  elevated: "bg-white border border-[var(--border)] shadow-lg",
  outlined: "bg-transparent border-2 border-[var(--border)]",
  ghost: "bg-transparent border-none shadow-none",
};

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    variant = "default", 
    padding = "md", 
    hover = false, 
    asChild = false,
    className = "", 
    children, 
    ...props 
  }, ref) => {
    const classes = `
      rounded-2xl transition-all duration-300 ease-out
      ${variantClasses[variant]}
      ${paddingClasses[padding]}
      ${hover && !asChild ? "hover:shadow-xl hover:-translate-y-1 cursor-pointer" : ""}
      ${className}
    `;

    if (asChild) {
      return (
        <motion.div
          ref={ref}
          className={classes}
          whileTap={hover ? { scale: 0.99 } : undefined}
          {...props}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <motion.div
        ref={ref}
        className={classes}
        whileTap={hover ? { scale: 0.99 } : undefined}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={`mb-4 ${className}`} {...props}>{children}</div>
  )
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className = "", children, ...props }, ref) => (
    <h3 ref={ref} className={`text-lg font-semibold text-[var(--foreground)] ${className}`} {...props}>{children}</h3>
  )
);
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className = "", children, ...props }, ref) => (
    <p ref={ref} className={`mt-1 text-sm text-[color:var(--muted)] ${className}`} {...props}>{children}</p>
  )
);
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={className} {...props}>{children}</div>
  )
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => (
    <div ref={ref} className={`mt-4 flex items-center gap-2 ${className}`} {...props}>{children}</div>
  )
);
CardFooter.displayName = "CardFooter";

export const CardImage = forwardRef<HTMLDivElement, { src: string; alt: string; className?: string }>(
  ({ src, alt, className = "", ...props }, ref) => (
    <div ref={ref} className={`relative overflow-hidden rounded-xl ${className}`} {...props}>
      <img src={src} alt={alt} className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" loading="lazy" />
    </div>
  )
);
CardImage.displayName = "CardImage";