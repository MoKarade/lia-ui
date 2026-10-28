export type ReponseApi = { status: number; json: any };
export type Api = (methode: string, chemin: string, corps?: unknown) => Promise<ReponseApi>;
export function decider(o: { avant: string | null; apres: unknown; tagExiste: boolean }): { action: "rien"; raison: string } | { action: "poser"; tag: string };
export function versionDeContenu(reponse: unknown): string | null;
export function executer(o: { api: Api; depot: string; sha: string; avantSha: string | undefined }): Promise<string[]>;
