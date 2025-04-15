// app/components/AdminSidebar.js
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, List, FileText, User, LogOut } from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();

  // Define your navigation items
  const navItems = [
    { href: "/admin/search", icon: Search, label: "Search" },
    { href: "/admin/questions", icon: List, label: "Questions" },
    { href: "/admin/document", icon: FileText, label: "Documents" },
    { href: "/admin/credentials", icon: User, label: "Credentials" },
  ];

  return (
    <div className="w-16 bg-teal-600 flex flex-col items-center py-6 shadow-md">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`mb-8 p-2 ${
            pathname === item.href ? "bg-teal-700" : "hover:bg-teal-700"
          } rounded-md`}
          aria-label={item.label}
        >
          <item.icon className="text-white" size={24} />
        </Link>
      ))}
      <Link
        href="/admin"
        className="mt-auto p-2 hover:bg-teal-700 rounded-md"
        aria-label="Logout"
      >
        <LogOut className="text-white" size={24} />
      </Link>
    </div>
  );
}
