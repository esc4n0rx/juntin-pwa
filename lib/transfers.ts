export const TRANSFER_PREFIX = "__transfer__:"

export type ParsedTransferDescription = {
  transferId: string
  note: string
}

export const buildTransferDescription = (
  transferId: string,
  note?: string | null
) => {
  const encodedNote = note ? encodeURIComponent(note) : ""
  return `${TRANSFER_PREFIX}${transferId}::${encodedNote}`
}

export const parseTransferDescription = (
  description?: string | null
): ParsedTransferDescription | null => {
  if (!description || !description.startsWith(TRANSFER_PREFIX)) {
    return null
  }

  const payload = description.slice(TRANSFER_PREFIX.length)
  const [transferId, encodedNote] = payload.split("::")

  if (!transferId) {
    return null
  }

  return {
    transferId,
    note: encodedNote ? decodeURIComponent(encodedNote) : "",
  }
}
