import Image from "next/image";
import { 
  Video, 
  BookOpen, 
  Mic, 
  Image as ImageIcon, 
  PlusCircle 
} from "lucide-react";

export const JISLogo = ({ className, logoUrl }: { className?: string; logoUrl?: string }) => (
  <Image
    src={logoUrl || "/jis-logo.png"}
    alt="School Logo"
    width={32}
    height={32}
    className={`object-contain ${className ?? ""}`}
  />
);

export type AssignmentTypeDef = {
  id: 'VIDEO' | 'READING' | 'PRONUNCIATION' | 'IMAGE' | 'IELTS' | 'CUSTOM';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  colors: {
    bg: string;
    iconBg: string;
    iconColor: string;
    border: string;
  };
};

export const assignmentTypes: AssignmentTypeDef[] = [
  {
    id: 'VIDEO',
    title: 'Video',
    description: 'Create video-based assignments for student presentations and analysis',
    icon: Video,
    href: '/assignments/create?type=video',
    colors: {
      bg: 'bg-gradient-to-br from-purple-50 to-violet-100',
      iconBg: 'bg-purple-100 group-hover:bg-purple-200',
      iconColor: 'text-purple-600',
      border: 'hover:border-purple-200'
    }
  },
  {
    id: 'READING',
    title: 'Reading',
    description: 'Design reading comprehension and analysis assignments',
    icon: BookOpen,
    href: '/assignments/create?type=reading',
    colors: {
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-100',
      iconBg: 'bg-blue-100 group-hover:bg-blue-200',
      iconColor: 'text-blue-600',
      border: 'hover:border-blue-200'
    }
  },
  {
    id: 'PRONUNCIATION',
    title: 'Pronunciation',
    description: 'Build pronunciation practice and speaking exercises',
    icon: Mic,
    href: '/assignments/create?type=pronunciation',
    colors: {
      bg: 'bg-gradient-to-br from-emerald-50 to-green-100',
      iconBg: 'bg-emerald-100 group-hover:bg-emerald-200',
      iconColor: 'text-emerald-600',
      border: 'hover:border-emerald-200'
    }
  },
  {
    id: 'IMAGE',
    title: 'Image',
    description: 'Create visual analysis and interpretation assignments',
    icon: ImageIcon,
    href: '/assignments/create?type=image',
    colors: {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-100',
      iconBg: 'bg-amber-100 group-hover:bg-amber-200',
      iconColor: 'text-amber-600',
      border: 'hover:border-amber-200'
    }
  },
  {
    id: 'IELTS',
    title: 'IELTS',
    description: 'Prepare IELTS test practice and preparation materials',
    icon: JISLogo,
    href: '/assignments/create?type=ielts',
    colors: {
      bg: 'bg-gradient-to-br from-rose-50 to-pink-100',
      iconBg: 'bg-rose-100 group-hover:bg-rose-200',
      iconColor: 'text-rose-600',
      border: 'hover:border-rose-200'
    }
  },
  {
    id: 'CUSTOM',
    title: 'Custom',
    description: 'Create your own custom assignment type',
    icon: PlusCircle,
    href: '/assignments/create?type=custom',
    colors: {
      bg: 'bg-gradient-to-br from-slate-50 to-gray-100',
      iconBg: 'bg-slate-100 group-hover:bg-slate-200',
      iconColor: 'text-slate-600',
      border: 'hover:border-slate-200'
    }
  }
];


