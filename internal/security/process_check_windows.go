//go:build windows

package security

import "syscall"

const processQueryLimitedInformation = 0x1000

func processExists(pid int) bool {
	if pid <= 0 {
		return false
	}

	h, err := syscall.OpenProcess(processQueryLimitedInformation, false, uint32(pid))
	if err != nil {
		return false
	}
	defer syscall.CloseHandle(h)
	return true
}
