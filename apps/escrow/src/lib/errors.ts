/** Contract error numbers, in the words a student will understand. */
const CONTRACT_ERRORS: Record<number, string> = {
  1: "Không tìm thấy công việc này",
  2: "Không tìm thấy mốc này",
  3: "Chỉ bên thuê mới làm được việc này",
  4: "Chỉ người nhận việc mới làm được việc này",
  5: "Chỉ người phân xử mới làm được việc này",
  6: "Bạn không phải một bên của hợp đồng này",
  7: "Công việc không còn ở trạng thái chờ nhận",
  8: "Công việc chưa được ai nhận",
  9: "Công việc đã có người nhận rồi",
  10: "Không thể tự nhận việc do chính mình đăng",
  11: "Mốc này không còn chờ bàn giao",
  12: "Mốc này chưa được bàn giao",
  13: "Mốc này không trong trạng thái tranh chấp",
  14: "Đã quá hạn bàn giao mốc này",
  15: "Chưa tới hạn, chưa lấy lại tiền được",
  16: "Thời gian khách duyệt vẫn còn, chưa tự nhận được",
  17: "Số tiền không hợp lệ",
  18: "Danh sách mốc không hợp lệ",
  19: "Tỷ lệ chia không hợp lệ",
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
    return "Ví không đủ XLM để trả phí hoặc để khoá vào hợp đồng";
  }
  if (/not connected|Chưa kết nối/i.test(raw)) return "Hãy kết nối ví trước";
  if (/fetch|network|timeout|ECONN/i.test(raw)) return "Mạng chậm hoặc RPC lỗi, thử lại nhé";

  return raw.length > 160 ? "Giao dịch không thành công, thử lại nhé" : raw;
}
