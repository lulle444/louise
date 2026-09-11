export interface ActionState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  resultId?: string;
}

export const initialActionState: ActionState = { ok: false };
