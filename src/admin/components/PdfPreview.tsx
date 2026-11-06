import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, FolderDown, Printer, RefreshCw } from 'lucide-react';
import { Button, ErrorState, Modal, Spinner } from '@/components/ui';
import { downloadBlob, printBlob } from '@/lib/files';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  filename: string;
  /** Produces the PDF (from the API). Called when the dialog opens and on "Refresh". */
  load: () => Promise<Blob>;
  /** Extra controls in the footer (e.g. template picker). Changing `reloadKey` re-renders the PDF. */
  toolbar?: React.ReactNode;
  reloadKey?: string;
  /** Excel version of the same document (saved records only). */
  excel?: { filename: string; load: () => Promise<Blob> };
  /** Save PDF + Excel to the document folder chosen on this computer. */
  onSaveFiles?: () => Promise<unknown>;
  saveLabel?: string;
}

/** PDF preview in a dialog with Download and Print. The PDF is generated in the browser. */
export function PdfPreviewModal({
  open,
  onClose,
  title,
  filename,
  load,
  toolbar,
  reloadKey,
  excel,
  onSaveFiles,
  saveLabel = 'Save PDF & Excel',
}: Props) {
  const [excelBusy, setExcelBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const loadRef = useRef(load);
  const requestRef = useRef(0);
  loadRef.current = load;

  const run = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setError('');
    try {
      const b = await loadRef.current();
      if (request !== requestRef.current) return;
      setBlob(b);
      setUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(b);
      });
    } catch (e) {
      if (request !== requestRef.current) return;
      setError(e instanceof Error ? e.message : 'Could not create the PDF.');
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void run();
  }, [open, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) requestRef.current += 1;
  }, [open]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  useEffect(() => {
    if (!open) {
      setBlob(null);
      setUrl(null);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      footer={
        <>
          {toolbar && (
            <div className="mr-auto flex flex-wrap items-center gap-2">
              {toolbar}
            </div>
          )}
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className="size-4" />}
            onClick={() => void run()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Printer className="size-4" />}
            onClick={() => blob && printBlob(blob)}
            disabled={!blob}
          >
            Print
          </Button>
          {excel && (
            <Button
              variant="secondary"
              leftIcon={<FileSpreadsheet className="size-4" />}
              loading={excelBusy}
              onClick={async () => {
                setExcelBusy(true);
                try {
                  downloadBlob(await excel.load(), excel.filename);
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Could not create the Excel file.');
                } finally {
                  setExcelBusy(false);
                }
              }}
            >
              Download Excel
            </Button>
          )}
          {onSaveFiles && (
            <Button
              variant="secondary"
              leftIcon={<FolderDown className="size-4" />}
              loading={saveBusy}
              onClick={async () => {
                setSaveBusy(true);
                try {
                  await onSaveFiles();
                } finally {
                  setSaveBusy(false);
                }
              }}
            >
              {saveLabel}
            </Button>
          )}
          <Button
            leftIcon={<Download className="size-4" />}
            onClick={() => blob && downloadBlob(blob, filename)}
            disabled={!blob}
          >
            Download PDF
          </Button>
        </>
      }
    >
      <div className="relative h-[70dvh] min-h-[24rem] overflow-hidden rounded-field border border-line bg-snow-200">
        {url && !error && (
          <iframe
            title={`${title} preview`}
            src={`${url}#view=FitH`}
            className="size-full"
          />
        )}
        {loading && (
          <div className="absolute inset-0 grid place-items-center bg-snow-100/80">
            <Spinner label="Creating PDF" />
          </div>
        )}
        {error && (
          <div className="p-6">
            <ErrorState
              title="PDF not created"
              message={error}
              onRetry={() => void run()}
            />
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted">
        If the preview is blank on your phone, use Download — some mobile
        browsers cannot show PDFs inline.
      </p>
    </Modal>
  );
}
