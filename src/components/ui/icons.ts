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
  Pin, Play, Plug, Plus, PlusCircle, Puzzle, Radio, Receipt, RefreshCw, Repeat, Rocket, RotateCcw,
  Save, School, Scissors, Search, SearchX, Send, Server, Settings, Settings2, Share2, Shield,
  ShoppingCart, SlidersHorizontal, Sparkles, Star, Store, Sun,
  Table, Table2, Tag, Target, Timer, Trash2, TrendingDown, TrendingUp, Trophy, Truck, Tv,
  Upload, User, UserCog, Users, Video, Wallet, Wand2, Workflow, X, Zap, Circle,
} from 'lucide-react'
import type { ComponentType, CSSProperties } from 'react'

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
  Pin, Play, Plug, Plus, PlusCircle, Puzzle, Radio, Receipt, RefreshCw, Repeat, Rocket, RotateCcw,
  Save, School, Scissors, Search, SearchX, Send, Server, Settings, Settings2, Share2, Shield,
  ShoppingCart, SlidersHorizontal, Sparkles, Star, Store, Sun,
  Table, Table2, Tag, Target, Timer, Trash2, TrendingDown, TrendingUp, Trophy, Truck, Tv,
  Upload, User, UserCog, Users, Video, Wallet, Wand2, Workflow, X, Zap, Circle,
}

/** نام آیکون‌های پیشنهادی برای Module Builder */
export const ICON_NAMES = Object.keys(ICONS)
