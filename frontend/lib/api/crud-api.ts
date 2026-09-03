import { baseApi, type ApiTagType } from "./base-api";

export type EntityId = string | number;

export type CacheTag = {
  type: ApiTagType;
  id?: EntityId | "LIST";
};

export type CrudQueryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

export type CrudListArgs = {
  resource: string;
  tagType: ApiTagType;
  params?: CrudQueryParams;
};

export type CrudItemArgs = {
  resource: string;
  tagType: ApiTagType;
  id: EntityId;
};

export type CrudCreateArgs = {
  resource: string;
  tagType: ApiTagType;
  body: unknown;
  invalidatesTags?: readonly CacheTag[];
};

export type CrudUpdateArgs = CrudCreateArgs & {
  id: EntityId;
};

export type CrudDeleteArgs = {
  resource: string;
  tagType: ApiTagType;
  id: EntityId;
  invalidatesTags?: readonly CacheTag[];
};

function resourcePath(resource: string) {
  return resource.replace(/^\/+|\/+$/g, "");
}

function itemPath(resource: string, id: EntityId) {
  return `${resourcePath(resource)}/${encodeURIComponent(String(id))}`;
}

export function listTag(type: ApiTagType): CacheTag {
  return { type, id: "LIST" };
}

export function itemTags(type: ApiTagType, id: EntityId): CacheTag[] {
  return [{ type, id }, listTag(type)];
}

export const crudApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getList: build.query<unknown, CrudListArgs>({
      query: ({ resource, params }) => ({
        method: "GET",
        params,
        url: resourcePath(resource),
      }),
      providesTags: (_result, _error, { tagType }) => [listTag(tagType)],
    }),
    getById: build.query<unknown, CrudItemArgs>({
      query: ({ resource, id }) => ({
        method: "GET",
        url: itemPath(resource, id),
      }),
      providesTags: (_result, _error, { tagType, id }) => [{ type: tagType, id }],
    }),
    create: build.mutation<unknown, CrudCreateArgs>({
      query: ({ resource, body }) => ({
        body,
        method: "POST",
        url: resourcePath(resource),
      }),
      invalidatesTags: (_result, _error, { invalidatesTags, tagType }) =>
        invalidatesTags ? [...invalidatesTags] : [listTag(tagType)],
    }),
    update: build.mutation<unknown, CrudUpdateArgs>({
      query: ({ resource, id, body }) => ({
        body,
        method: "PATCH",
        url: itemPath(resource, id),
      }),
      invalidatesTags: (_result, _error, { invalidatesTags, tagType, id }) =>
        invalidatesTags ? [...invalidatesTags] : itemTags(tagType, id),
    }),
    delete: build.mutation<unknown, CrudDeleteArgs>({
      query: ({ resource, id }) => ({
        method: "DELETE",
        url: itemPath(resource, id),
      }),
      invalidatesTags: (_result, _error, { invalidatesTags, tagType, id }) =>
        invalidatesTags ? [...invalidatesTags] : itemTags(tagType, id),
    }),
  }),
});

export const {
  useCreateMutation,
  useDeleteMutation,
  useGetByIdQuery,
  useGetListQuery,
  useUpdateMutation,
} = crudApi;
