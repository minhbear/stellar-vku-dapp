/** Contract error numbers, in the words a student will understand. */
const CONTRACT_ERRORS: Record<number, string> = {
  1: "Không tìm thấy hũ này",
  2: "Bạn không phải thành viên của hũ",
  3: "Bạn đã là thành viên của hũ rồi",
  4: "Chỉ người tạo hũ mới làm được việc này",
  5: "Hũ không còn mở nữa",
  6: "Hũ chưa vào bước quyết toán",
  7: "Số tiền không hợp lệ",
  8: "Không tìm thấy yêu cầu chi",
  9: "Yêu cầu chi này đã đóng",
  10: "Bạn đã duyệt yêu cầu này rồi",
  11: "Hũ không còn đủ tiền",
  12: "Vẫn còn người chưa đóng bù, chưa chốt được",
  13: "Bạn không nợ gì cả",
  14: "Hũ đã đủ số thành viên tối đa",
  15: "Hũ chưa có thành viên nào",
};

/**
 * Soroban reports a failed call as `Error(Contract, #5)`. Everything else that
 * can go wrong is a wallet or network problem, so it gets its own wording.
 */
export function describeError(caught: unknown): string {
  const raw = caught instanceof Error ? caught.message : String(caught);

  const contractCode = raw.match(/Error\(Contract,\s*#(\d+)\)/);
  if (contractCode) {
    const code = Number(contractCode[1]);
    return CONTRACT_ERRORS[code] ?? `Giao dịch bị từ chối (mã ${code})`;
  }

  if (/User declined|rejected|denied/i.test(raw)) return "Bạn đã huỷ ký giao dịch";
  if (/insufficient|underfunded|tx_insufficient_balance/i.test(raw)) {
    return "Ví không đủ XLM để trả phí hoặc để chuyển";
  }
  if (/not connected|Chưa kết nối/i.test(raw)) return "Hãy kết nối ví trước";
  if (/fetch|network|timeout|ECONN/i.test(raw)) return "Mạng chậm hoặc RPC lỗi, thử lại nhé";

  return raw.length > 160 ? "Giao dịch không thành công, thử lại nhé" : raw;
}
