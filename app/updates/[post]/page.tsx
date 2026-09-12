import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getMessages } from "@/lib/dictionaries";
import { createPageMetadata } from "@/lib/metadata";
import { updatePath } from "@/lib/routes";
import { UpdatePage, updateMetadata } from "../../_pages/update";
import { getPost, togashiPosts } from "../../data/updates";

const messages = getMessages("en");

export const dynamicParams = false;

export function generateStaticParams() {
  return togashiPosts.map((post) => ({ post: post.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ post: string }>;
}): Promise<Metadata> {
  const { post } = await params;
  const record = getPost(post);
  if (!record) return {};

  return createPageMetadata({
    locale: "en",
    messages,
    path: updatePath(record.id),
    ...updateMetadata(record, "en", messages),
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ post: string }>;
}) {
  const { post } = await params;
  const record = getPost(post);
  if (!record) notFound();

  return <UpdatePage locale="en" messages={messages} post={record} />;
}
