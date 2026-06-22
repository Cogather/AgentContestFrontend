export const INVALID_ZIP_MESSAGE = '程序包的格式错误，请上传zip格式的压缩包'
export const FILE_TOO_LARGE_MESSAGE = '程序包超过 100MB，请压缩后重新上传'
export const MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024
export const UPLOAD_LIMIT_TEXT = '仅支持 100MB 以内 .zip 压缩包'

export const isZipPackage = (file) => {
  return file?.name?.toLowerCase().endsWith('.zip') === true
}

export const formatFileSizeMb = (bytes) => {
  const size = Number(bytes)
  return Number.isFinite(size) && size >= 0
    ? `${(size / 1024 / 1024).toFixed(2)} MB`
    : '-'
}

export const validateUploadPackage = (file) => {
  if (!isZipPackage(file)) {
    return { valid: false, message: INVALID_ZIP_MESSAGE }
  }

  const size = Number(file?.size)
  if (Number.isFinite(size) && size > MAX_UPLOAD_SIZE_BYTES) {
    return { valid: false, message: FILE_TOO_LARGE_MESSAGE }
  }

  return { valid: true }
}
