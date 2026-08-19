// EventToken.h — تعریف استاندارد ویندوز (Windows::Foundation::EventRegistrationToken)
#pragma once

#ifndef _EVENTTOKEN_H_
#define _EVENTTOKEN_H_

#ifdef __cplusplus
namespace Windows {
namespace Foundation {
struct EventRegistrationToken {
  __int64 value;
};
}  // namespace Foundation
}  // namespace Windows

// در ++C نام سراسری هم در دسترس باشد (مشابه SDK رسمی)
using Windows::Foundation::EventRegistrationToken;
#else   // C
typedef struct EventRegistrationToken {
  __int64 value;
} EventRegistrationToken;
#endif  // __cplusplus

#endif  // _EVENTTOKEN_H_
