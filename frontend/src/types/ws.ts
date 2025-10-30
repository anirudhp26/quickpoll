import { Poll } from "./poll";

export interface WSMessage {
  type: string
  poll_id: number
  data: Poll
}
