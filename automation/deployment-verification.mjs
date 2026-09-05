export function deploymentContainsVerdict(status, feed, verdict) {
  if (status?.revision !== verdict.revision) return false;
  for (const milestone of verdict.milestones.chapters) {
    if (!status.chapters?.some((row) => row.chapter === milestone.chapter && row.status === milestone.to)) return false;
  }
  if (verdict.milestones.publication && status.publicationStatus !== verdict.milestones.publication.to) return false;
  return (verdict.posts ?? []).every((post) => feed?.posts?.some((row) => row.id === post.id));
}
