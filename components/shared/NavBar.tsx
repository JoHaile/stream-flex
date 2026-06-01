"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { SearchIcon, BellIcon, Menu } from "lucide-react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";

const NavLinks = ({
  pathname,
  links,
  className,
  isMobile = false
}: {
  pathname: string;
  links: { href: string; label: string }[];
  className?: string;
  isMobile?: boolean;
}) => {
  return (
    <ul className={`flex ${isMobile ? "flex-col gap-4" : "flex-row items-center gap-6"} ${className}`}>
      {links.map((link) => {
        const isActive =
          link.href === "/"
          ? pathname === "/"
          : pathname.startsWith(link.href);

        const linkContent = (
          <Link
            href={link.href}
            className={`text-sm font-medium transition-colors block ${
              isMobile ? "py-2 px-4 rounded-lg" : ""
            } ${
              isActive
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
            {isActive && (
              <span className={`block h-0.5 ${isMobile ? "mt-1" : "mt-0.5"} bg-foreground rounded-full`} />
            )}
          </Link>
        );

        return (
          <li key={link.href} className="w-full">
            {isMobile ? <DrawerClose asChild>{linkContent}</DrawerClose> : linkContent}
          </li>
        );
      })}
    </ul>
  );
};

const NavActions = ({
  className,
  isMobile = false
}: {
  className?: string;
  isMobile?: boolean;
}) => {
  return (
    <div className={`flex ${isMobile ? "flex-col gap-4 items-start" : "flex-row items-center gap-3"} ${className}`}>
      <button className="p-1.5 rounded-full hover:bg-muted transition-colors flex items-center gap-2">
        <SearchIcon className="w-4 h-4 text-muted-foreground" />
        {isMobile && <span className="text-sm text-muted-foreground">Search</span>}
      </button>
      <button className="p-1.5 rounded-full hover:bg-muted transition-colors flex items-center gap-2">
        <BellIcon className="w-4 h-4 text-muted-foreground" />
        {isMobile && <span className="text-sm text-muted-foreground">Notifications</span>}
      </button>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 ring-2 ring-white shadow-sm" />
    </div>
  );
};

function NavBar() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home" },
    { href: "/movies", label: "Movies" },
    { href: "/tv-series", label: "TV Series" },
  ];

  return (
    <div className="w-full relative py-3 px-4 z-50">
      <div className="flex justify-between items-center py-3 px-6 border border-border/60 max-w-5xl mx-auto rounded-full sticky top-0 bg-background/95 backdrop-blur-md shadow-sm">
        {/* Logo */}
        <Link
          href="/"
          className="text-lg font-black tracking-tight hover:opacity-80 transition-opacity"
        >
          StreamFlix
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:block">
          <NavLinks pathname={pathname} links={links} />
        </nav>

        {/* Desktop Right side */}
        <div className="hidden md:flex">
          <NavActions />
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
          <Drawer>
            <DrawerTrigger asChild>
              <button className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader className="text-left">
                <DrawerTitle>Menu</DrawerTitle>
              </DrawerHeader>
              <div className="p-4 flex flex-col gap-6">
                <NavLinks pathname={pathname} links={links} isMobile />
                <hr className="border-border/60" />
                <NavActions isMobile />
              </div>
              <div className="p-4 flex justify-end">
                 <DrawerClose asChild>
                    <button className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                      Close
                    </button>
                 </DrawerClose>
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </div>
  );
}

export default NavBar;
