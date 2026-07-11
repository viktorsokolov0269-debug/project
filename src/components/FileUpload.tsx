interface FileUploadProps {
  label: string
  hint: string
  count: number
  accept?: string
  onFile: (file: File) => void
  loadedName?: string
}

export function FileUpload({
  label,
  hint,
  count,
  accept = '.xlsx,.xls,.csv',
  onFile,
  loadedName,
}: FileUploadProps) {
  return (
    <label className="file-upload">
      <div className="file-upload__top">
        <span className="file-upload__label">{label}</span>
        {count > 0 && <span className="file-upload__count">{count}</span>}
      </div>
      <span className="file-upload__hint">{hint}</span>
      <span className="file-upload__button">
        {loadedName ? 'Заменить файл' : 'Выбрать Excel'}
      </span>
      {loadedName && <span className="file-upload__file">{loadedName}</span>}
      <input
        type="file"
        accept={accept}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFile(file)
          e.target.value = ''
        }}
      />
    </label>
  )
}
