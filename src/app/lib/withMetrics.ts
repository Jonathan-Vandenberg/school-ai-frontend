import { httpRequestCounter, httpRequestDuration, errorCounter } from "@/app/lib/metrics";
import { NextRequest, NextResponse } from "next/server";

// For App Router (NextRequest/NextResponse)
export function withAppRouterMetrics(handler: (request: NextRequest) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    const end = httpRequestDuration.startTimer();
    try {
      const response = await handler(request);
      
      // Record metrics
      const method = request.method;
      const url = request.url;
      const status = response.status;

      httpRequestCounter
        .labels(method, url, status.toString())
        .inc();
      
      end({ method, route: url, status });

      return response;
    } catch (error) {
      // Record error metrics
      const method = request.method;
      const url = request.url;
      const status = 500;

      httpRequestCounter
        .labels(method, url, status.toString())
        .inc();
      
      // Record specific error type
      errorCounter
        .labels(method, url, status.toString(), error instanceof Error ? error.constructor.name : 'Unknown')
        .inc();
      
      end({ method, route: url, status });

      throw error;
    }
  };
}

// For Pages Router (NextApiRequest/NextApiResponse) - keeping original for backward compatibility
export default function withMetrics(handler: any) {
  return async (req: any, res: any) => {
    const end = httpRequestDuration.startTimer();

    res.on("finish", () => {
      httpRequestCounter
        .labels(req.method, req.url || "unknown", res.statusCode.toString())
        .inc();
      end({ method: req.method, route: req.url || "unknown", status: res.statusCode });
    });

    return handler(req, res);
  };
}
