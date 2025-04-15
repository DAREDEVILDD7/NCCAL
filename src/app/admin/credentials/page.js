"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AdminSidebar from "../../../app/components/AdminSidebar";

export default function AdminCredentials() {

  return (
    <div className="flex h-screen bg-teal-500">
      <AdminSidebar />
    </div>
  );
}
