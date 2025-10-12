'use client'

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { assignmentTypes } from "../../lib/assignment-types";
import { useTenant } from "@/components/providers/tenant-provider";
import { Loader2 } from "lucide-react";

export default function AssignmentsPage() {
  const { data: session, status } = useSession();
  const { tenant } = useTenant();

  if (status === 'loading') {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
                    {type.id === 'IELTS' ? (
                      <IconComponent className={`h-8 w-8 ${type.colors.iconColor}`} logoUrl={tenant?.branding?.logo_url} {...({} as any)} />
                    ) : (
                      <IconComponent className={`h-8 w-8 ${type.colors.iconColor}`} />
                    )}
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