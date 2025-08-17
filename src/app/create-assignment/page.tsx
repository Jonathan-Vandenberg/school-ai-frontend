import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Video, 
  BookOpen, 
  Mic, 
  Image, 
  FileText, 
  PlusCircle 
} from "lucide-react";

export const assignmentTypes = [
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
    icon: Image,
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
    icon: FileText,
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
  },
];

export default async function AssignmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return <p>Not Authorized</p>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Assignment</h1>
        <p className="text-muted-foreground">Choose the type of assignment you want to create</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assignmentTypes.map((type) => {
          const IconComponent = type.icon;
          return (
            <Link key={type.id} href={type.href}>
              <Card className={`h-full transition-all duration-200 hover:shadow-lg hover:scale-105 cursor-pointer group border-0 ${type.colors.bg} ${type.colors.border}`}>
                <CardHeader className="text-center">
                  <div className={`mx-auto mb-4 p-3 rounded-full w-fit transition-colors ${type.colors.iconBg}`}>
                    <IconComponent className={`h-8 w-8 ${type.colors.iconColor}`} />
                  </div>
                  <CardTitle className="text-xl text-gray-800">{type.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-gray-600">
                    {type.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}