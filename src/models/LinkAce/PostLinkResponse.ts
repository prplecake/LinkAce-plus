import {LinkStatus} from "./LinkStatus";
import {List} from "./List";
import {Tag} from "./Tag";

export interface PostLinkResponse {
  id: number;
  user_id: number;
  url: string;
  title: string;
  description: string | null;
  icon: string | null;
  is_private: string;
  status: LinkStatus;
  check_disabled: boolean;
  lists: List[];
  tags: Tag[];
  created_at: string;
  updated_at: string;
  deleted_at: string;
}