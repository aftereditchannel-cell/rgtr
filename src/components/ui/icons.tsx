/**
 * رجیستری آیکون — فقط آیکون‌های استفاده‌شده import می‌شوند تا bundle کوچک بماند.
 * برای افزودن آیکون جدید (مثلاً در Module Builder): نامش را از lucide.dev بردارید،
 * اینجا import و در MAP اضافه کنید.
 */
import {
  Activity, AlertTriangle, Archive, ArrowLeft, ArrowRight, ArrowUpRight, AtSign, Award,
  BarChart3, Bell, Blocks, Bookmark, Bot, Box, Boxes, Brain, Briefcase, Building2,
  Calendar, CalendarOff, CalendarPlus, CalendarRange, Camera, Check, CheckCircle2, CheckSquare,
  ChevronLeft, ChevronRight, Clapperboard, ClipboardList, Clock, Cloud, CloudCheck, CloudDownload,
  CloudOff, CloudUpload, Code, Coins, Columns3,
  Command, Compass, Contact, Copy, CornerDownLeft, Cpu, CreditCard, Crown,
  ChevronDown, ChevronUp, Database, DatabaseBackup, Disc3, DollarSign, Download, ExternalLink, Eye, EyeOff, HelpCircle,
  File, FileText, Files, Film, Filter, Flag, Flame, Folder, FolderKanban, FolderOpen, FolderPlus,
  Gauge, Gem, GitBranch, Globe, GraduationCap, GripVertical, Handshake, Hash, Headphones, Heart, History, Hourglass,
  KeyRound, Languages, Loader,
  Image, Inbox, Info, Key, Landmark, Layers, LayoutDashboard, LayoutGrid, Lightbulb, Link2, ListTodo,
  Mail, Map, MapPin, Maximize2, Megaphone, Menu, MessageCircle, Monitor, Smartphone, MessageSquare, Mic2, Minimize2, Moon, MoreHorizontal, Music,
  Network, Newspaper, Package, Palette, Paperclip, PartyPopper, Pause, Pencil, PenTool, Percent, Phone, PieChart,
  Lock, LogOut, MessageSquarePlus,
  Pin, Play, Plug, Plus, PlusCircle, Puzzle, Radio, Receipt, RefreshCw, Repeat, Rocket, RotateCcw,
  Save, School, Scissors, Search, SearchX, Send, Server, Settings, Settings2, Share2, Shield,
  ShoppingCart, SlidersHorizontal, Sparkles, Star, Store, Sun,
  Table, Table2, Tag, Target, Timer, Trash2, TrendingDown, TrendingUp, Trophy, Truck, Tv,
  Upload, User, UserCog, Users, Video, Wallet, Wand2, Workflow, X, Zap, Circle,
} from 'lucide-react'
import type { ComponentType, CSSProperties, ReactNode, ReactElement } from 'react'
import { Icon } from './Primitives'

export type IconComp = ComponentType<{ size?: number; className?: string; style?: CSSProperties; strokeWidth?: number }>

export const ICONS: Record<string, IconComp> = {
  Activity, AlertTriangle, Archive, ArrowLeft, ArrowRight, ArrowUpRight, AtSign, Award,
  BarChart3, Bell, Blocks, Bookmark, Bot, Box, Boxes, Brain, Briefcase, Building2,
  Calendar, CalendarOff, CalendarPlus, CalendarRange, Camera, Check, CheckCircle2, CheckSquare,
  ChevronLeft, ChevronRight, Clapperboard, ClipboardList, Clock, Cloud, CloudCheck, CloudDownload,
  CloudOff, CloudUpload, Code, Coins, Columns3,
  Command, Compass, Contact, Copy, CornerDownLeft, Cpu, CreditCard, Crown,
  ChevronDown, ChevronUp, Database, DatabaseBackup, Disc3, DollarSign, Download, ExternalLink, Eye, EyeOff, HelpCircle,
  File, FileText, Files, Film, Filter, Flag, Flame, Folder, FolderKanban, FolderOpen, FolderPlus,
  Gauge, Gem, GitBranch, Globe, GraduationCap, GripVertical, Handshake, Hash, Headphones, Heart, History, Hourglass,
  KeyRound, Languages, Loader,
  Image, Inbox, Info, Key, Landmark, Layers, LayoutDashboard, LayoutGrid, Lightbulb, Link2, ListTodo,
  Mail, Map, MapPin, Maximize2, Megaphone, Menu, MessageCircle, Monitor, Smartphone, MessageSquare, Mic2, Minimize2, Moon, MoreHorizontal, Music,
  Network, Newspaper, Package, Palette, Paperclip, PartyPopper, Pause, Pencil, PenTool, Percent, Phone, PieChart,
  Lock, LogOut, MessageSquarePlus,
  Pin, Play, Plug, Plus, PlusCircle, Puzzle, Radio, Receipt, RefreshCw, Repeat, Rocket, RotateCcw,
  Save, School, Scissors, Search, SearchX, Send, Server, Settings, Settings2, Share2, Shield,
  ShoppingCart, SlidersHorizontal, Sparkles, Star, Store, Sun,
  Table, Table2, Tag, Target, Timer, Trash2, TrendingDown, TrendingUp, Trophy, Truck, Tv,
  Upload, User, UserCog, Users, Video, Wallet, Wand2, Workflow, X, Zap, Circle,
}

/** نام آیکون‌های پیشنهادی برای Module Builder */
export const ICON_NAMES = Object.keys(ICONS)

/* ---------- آیکون برند پلتفرم‌ها (SVG ساده) ---------- */
type BrandProps = { size?: number; className?: string; style?: CSSProperties }
function Brand({ size = 16, className = '', style, children, vb = '0 0 24 24' }: BrandProps & { children: ReactNode; vb?: string }) {
  return (
    <svg width={size} height={size} viewBox={vb} fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>{children}</svg>
  )
}
export const BrandIcons: Record<string, (p: BrandProps) => ReactElement> = {
  Telegram: (p) => (
    <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="currentColor" className={p.className} style={p.style}>
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z" />
    </svg>
  ),
  SoundCloud: (p) => (
    <Brand {...p}>
      <path d="M2 16v-3a5 5 0 0 1 9.9-1 4 4 0 1 1 .1 8H2z" />
      <path d="M13 16V8a1 1 0 0 1 2 0v8M17 10v6M21 12v4" />
    </Brand>
  ),
  Spotify: (p) => (
    <svg width={p.size} height={p.size} viewBox="0 0 24 24" fill="currentColor" className={p.className} style={p.style}>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.5 14.4a.62.62 0 0 1-.86.2c-2.35-1.44-5.3-1.76-8.78-.96a.62.62 0 1 1-.28-1.22c3.82-.88 7.07-.5 9.72 1.12.3.18.39.57.2.86zm1.2-2.7a.78.78 0 0 1-1.07.25c-2.68-1.65-6.77-2.13-9.94-1.17a.78.78 0 1 1-.45-1.5c3.63-1.1 8.1-.56 11.21 1.35.37.22.48.7.25 1.07zm.1-2.82C14.7 8.9 9.4 8.7 6.3 9.66a.94.94 0 1 1-.54-1.8c3.55-1.08 9.34-.86 13 1.38a.94.94 0 0 1-.96 1.62z" />
    </svg>
  ),
  Instagram: (p) => (
    <Brand {...p}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </Brand>
  ),
  Youtube: (p) => (
    <Brand {...p}>
      <rect x="2" y="5" width="20" height="14" rx="4" />
      <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
    </Brand>
  ),
  Generic: (p) => <Brand {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></Brand>,
}

export function PlatformIcon({ platform, size = 16, className = '', style }: { platform: string; size?: number; className?: string; style?: CSSProperties }) {
  const C = BrandIcons[platform]
  if (C) return <C size={size} className={className} style={style} />
  return <Icon name="Link2" size={size} className={className} style={style} />
}
