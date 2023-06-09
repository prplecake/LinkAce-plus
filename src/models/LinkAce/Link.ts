export interface Link {
  url: string;
  title?: string;
  description?: string;
  lists?: string | string[] | number[];
  tags?: string | string[] | number[];
  is_private?: boolean;
  check_disabled?: boolean;
}