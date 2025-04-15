"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AdminSidebar from "../../../app/components/AdminSidebar";

export default function AdminQuestions() {

  return (
    <div className="flex h-screen bg-teal-500">
      <AdminSidebar />
    </div>
  );
}
