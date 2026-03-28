import pc from "picocolors";
import type { Company } from "@paperclipai/shared";

const DGDH_COMPANY_NAME = "David Geib Digitales Handwerk";
const DEFAULT_API_URL = "http://127.0.0.1:3100";

// Local type definition for triad preflight response
interface TriadPreflightResponse {
  allRolesPresent: boolean;
  allAgentsIdle: boolean;
  triadReady: boolean;
  roles: Array<{
    roleTemplateId: string;
    present: boolean;
    agentId: string | null;
    agentName: string | null;
    status: string | null;
  }>;
  blockers: string[];
}

interface StatusOptions {
  apiUrl?: string;
}

interface StatusResult {
  exitCode: number;
}

interface HealthResponse {
  status: string;
  deploymentMode?: string;
  seedStatus?: {
    dgdhCompanyFound: boolean;
    agentRolesFound: {
      ceo: boolean;
      worker: boolean;
      reviewer: boolean;
    };
  };
}

async function fetchHealth(apiUrl: string): Promise<HealthResponse> {
  const url = `${apiUrl.replace(/\/+$/, "")}/api/health`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Health endpoint returned ${response.status}`);
  }
  
  const data = await response.json() as HealthResponse;
  return data;
}

async function fetchCompanies(apiUrl: string): Promise<Company[]> {
  const url = `${apiUrl.replace(/\/+$/, "")}/api/companies`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Companies endpoint returned ${response.status}`);
  }
  
  const data = await response.json() as Company[];
  return data;
}

async function fetchPreflight(apiUrl: string, companyId: string): Promise<TriadPreflightResponse> {
  const url = `${apiUrl.replace(/\/+$/, "")}/api/companies/${companyId}/agents/triad-preflight`;
  const response = await fetch(url);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Company not found");
    }
    throw new Error(`Preflight endpoint returned ${response.status}`);
  }
  
  const data = await response.json() as TriadPreflightResponse;
  return data;
}

function resolveApiUrl(options: StatusOptions): string {
  // Priority: --api-url flag > PAPERCLIP_API_URL env > default
  return options.apiUrl?.trim() || process.env.PAPERCLIP_API_URL?.trim() || DEFAULT_API_URL;
}

export async function runtimeStatus(options: StatusOptions = {}): Promise<StatusResult> {
  const apiUrl = resolveApiUrl(options);
  
  try {
    // Step 1: Call health endpoint
    const health = await fetchHealth(apiUrl);
    
    // Print health summary
    console.log(pc.bold("Runtime Status"));
    console.log(`  API URL: ${apiUrl}`);
    console.log(`  Status: ${health.status === "ok" ? pc.green("ok") : pc.red(health.status)}`);
    
    if (health.deploymentMode) {
      console.log(`  Deployment Mode: ${health.deploymentMode}`);
    }
    
    if (health.seedStatus) {
      const companyFound = health.seedStatus.dgdhCompanyFound;
      console.log(`  DGDH Company: ${companyFound ? pc.green("found") : pc.yellow("not found")}`);
      
      if (companyFound) {
        console.log(`  Agent Roles:`);
        console.log(`    CEO: ${health.seedStatus.agentRolesFound.ceo ? pc.green("✓") : pc.red("✗")}`);
        console.log(`    Worker: ${health.seedStatus.agentRolesFound.worker ? pc.green("✓") : pc.red("✗")}`);
        console.log(`    Reviewer: ${health.seedStatus.agentRolesFound.reviewer ? pc.green("✓") : pc.red("✗")}`);
      }
    }
    
    console.log();
    
    // Step 2: If DGDH company found, fetch companies and preflight
    if (health.seedStatus?.dgdhCompanyFound) {
      try {
        const companies = await fetchCompanies(apiUrl);
        const dgdhCompany = companies.find(c => c.name === DGDH_COMPANY_NAME);
        
        if (dgdhCompany) {
          console.log(pc.bold("Triad Preflight"));
          console.log(`  Company: ${dgdhCompany.name} (${dgdhCompany.id})`);
          
          try {
            const preflight = await fetchPreflight(apiUrl, dgdhCompany.id);
            
            console.log(`  All Roles Present: ${preflight.allRolesPresent ? pc.green("true") : pc.red("false")}`);
            console.log(`  All Agents Idle: ${preflight.allAgentsIdle ? pc.green("true") : pc.red("false")}`);
            console.log(`  Triad Ready: ${preflight.triadReady ? pc.green("true") : pc.red("false")}`);
            
            if (preflight.roles.length > 0) {
              console.log();
              console.log(pc.bold("  Roles:"));
              for (const role of preflight.roles) {
                const present = role.present ? pc.green("present") : pc.red("missing");
                const status = role.status === "idle" ? pc.green("idle") : pc.yellow(role.status ?? "unknown");
                console.log(`    ${role.roleTemplateId}: ${present}${role.present ? ` (${status})` : ""}`);
              }
            }
            
            if (preflight.blockers.length > 0) {
              console.log();
              console.log(pc.bold(pc.yellow("  Blockers:")));
              for (const blocker of preflight.blockers) {
                console.log(`    - ${blocker}`);
              }
            }
          } catch (preflightErr) {
            console.log(pc.yellow(`  Preflight check unavailable: ${preflightErr instanceof Error ? preflightErr.message : String(preflightErr)}`));
          }
        } else {
          console.log(pc.yellow("  DGDH company not found in companies list"));
        }
      } catch (companiesErr) {
        console.log(pc.yellow(`  Could not fetch company details: ${companiesErr instanceof Error ? companiesErr.message : String(companiesErr)}`));
      }
    }
    
    return { exitCode: 0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(pc.red(`Error: ${message}`));
    return { exitCode: 1 };
  }
}
